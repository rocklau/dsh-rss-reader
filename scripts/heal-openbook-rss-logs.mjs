#!/usr/bin/env node
/**
 * Heal session logs written by openbook-rss < 0.2.0.
 *
 * Older versions appended `openbook-rss/*` telemetry into the shared session
 * log without the envelope's `ignorable` marker. The persistence read path
 * refuses any log containing an unknown non-ignorable event type, so every
 * session a sync ever ran in became unloadable after a process restart
 * (`history unavailable … not marked ignorable`).
 *
 * This script rewrites affected artifacts in place, adding `"ignorable":true`
 * to every `openbook-rss/*` event line — exactly what the writer should have
 * produced: these records are pure telemetry and never participate in
 * conversation reconstruction. Header and all other events are copied through
 * unchanged; files without openbook-rss events are left untouched.
 *
 * Artifacts use a concatenated-zstd-frame container whose first frame holds
 * exactly one line — the header record — while every later frame holds one
 * durable event batch (multi-line plaintext). Frames are located with the
 * same structural scan the harness backend uses, decompressed individually,
 * healed as plaintext JSONL, and rewritten in that layout: header-only first
 * frame, then fixed-size event-batch frames. Artifacts whose framing violates
 * the header-frame invariant are re-framed even when no event needs healing.
 * Every candidate write is validated with the backend's own acceptance rule
 * before it replaces the original.
 *
 * Usage:
 *   node scripts/heal-openbook-rss-logs.mjs [sessionsRoot] [--dry-run]
 *
 * Defaults to `$DSH_HOME/sessions` (or `~/.dsh/sessions`). Atomic per file:
 * write `<artifact>.heal-tmp`, then rename over the original.
 */
import { readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { constants, zstdCompressSync, zstdDecompressSync } from 'node:zlib'

const ZSTD_MAGIC = 0xFD2FB528

/**
 * Locate structurally complete frames in a concatenated Zstandard stream.
 * Byte-level twin of the backend's scanner (dsh-session-persistence-jsonl):
 * invalid structure rejects; EOF inside a trailing frame yields its start as
 * `tornStart`, which this healer treats as unreadable and skips loudly rather
 * than repairing (a torn tail means the writer died mid-flush — leave it to
 * the harness's own recovery path).
 */
function scanZstdFrames(buffer) {
  const frames = []
  let offset = 0
  while (offset < buffer.length) {
    const start = offset
    if (buffer.length - offset < 4) return { frames, tornStart: start }
    if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) {
      throw new Error(`invalid frame magic at byte ${offset}`)
    }
    offset += 4
    if (offset === buffer.length) return { frames, tornStart: start }
    const descriptor = buffer.readUInt8(offset)
    offset += 1
    if ((descriptor & 0x18) !== 0) throw new Error(`reserved frame-header bit at byte ${offset - 1}`)
    const contentSizeFlag = descriptor >>> 6
    const singleSegment = (descriptor & 0x20) !== 0
    const checksum = (descriptor & 0x04) !== 0
    const dictionaryFlag = descriptor & 0x03
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag
    const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : 1 << contentSizeFlag
    const remainingHeaderBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes
    if (buffer.length - offset < remainingHeaderBytes) return { frames, tornStart: start }
    offset += remainingHeaderBytes
    for (;;) {
      if (buffer.length - offset < 3) return { frames, tornStart: start }
      const blockHeader = Number(buffer.readBigInt64LE(offset) & 0xFFFFFFn)
      offset += 3
      const lastBlock = (blockHeader & 1) !== 0
      const blockType = (blockHeader >>> 1) & 0x03
      const blockSize = blockHeader >>> 3
      if (blockType === 0x03) throw new Error(`reserved block type at byte ${offset - 3}`)
      const payloadBytes = blockType === 0x01 ? 1 : blockSize
      if (buffer.length - offset < payloadBytes) return { frames, tornStart: start }
      offset += payloadBytes
      if (lastBlock) break
    }
    if (checksum) {
      if (buffer.length - offset < 4) return { frames, tornStart: start }
      offset += 4
    }
    frames.push([start, offset])
  }
  return { frames }
}

/** Decompress every complete frame and concatenate the plaintext. */
function decompressAllFrames(raw) {
  const { frames, tornStart } = scanZstdFrames(raw)
  if (tornStart !== undefined) {
    throw new Error(`torn final frame at byte ${tornStart} — run while no host has the session open`)
  }
  const parts = frames.map(([start, end]) => zstdDecompressSync(raw.subarray(start, end)))
  return Buffer.concat(parts).toString('utf8')
}

const CHECKSUM_PARAMS = { params: { [constants.ZSTD_c_checksumFlag]: 1 } }
/** Upper bound on plaintext bytes per rewritten event-batch frame. */
const FRAME_CHUNK_BYTES = 256 * 1024

/**
 * Encode JSONL text in the container layout the backend accepts: an
 * independently decodable header frame (exactly one line), then event-batch
 * frames of at most {@link FRAME_CHUNK_BYTES} plaintext bytes each.
 */
function encodeContainer(text) {
  const firstNewline = text.indexOf('\n')
  if (firstNewline === -1) throw new Error('artifact has no header line')
  const header = text.slice(0, firstNewline + 1)
  const rest = text.slice(header.length)
  const chunks = []
  for (const line of rest.split('\n')) {
    const last = chunks[chunks.length - 1]
    if (line !== '' && last !== undefined && last.bytes + line.length + 1 <= FRAME_CHUNK_BYTES) {
      last.lines.push(line)
      last.bytes += line.length + 1
    } else if (line !== '') {
      chunks.push({ lines: [line], bytes: line.length + 1 })
    }
  }
  return Buffer.concat([
    zstdCompressSync(Buffer.from(header, 'utf8'), CHECKSUM_PARAMS),
    ...chunks.map(chunk => zstdCompressSync(Buffer.from(`${chunk.lines.join('\n')}\n`, 'utf8'), CHECKSUM_PARAMS)),
  ])
}

/**
 * Apply the backend's acceptance rule for the first frame: its plaintext must
 * be exactly one terminated line (`assertZstdHeaderFrame`).
 */
function assertHeaderFrameLayout(raw) {
  const { frames } = scanZstdFrames(raw)
  if (frames.length === 0) throw new Error('no complete frames')
  const plaintext = zstdDecompressSync(raw.subarray(frames[0][0], frames[0][1]))
  if (plaintext.length === 0 || plaintext.indexOf(0x0A) !== plaintext.length - 1) {
    throw new Error('first frame is not exactly one header line')
  }
}

/** Add the ignorable marker to openbook-rss event lines. @returns healed count. */
function healText(text) {
  let healed = 0
  const lines = text.split('\n')
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (line === '') continue
    let event
    try { event = JSON.parse(line) } catch { continue }
    if (typeof event.type !== 'string' || !event.type.startsWith('openbook-rss/')) continue
    if (event.ignorable === true) continue
    event.ignorable = true
    lines[index] = JSON.stringify(event)
    healed++
  }
  return { text: lines.join('\n'), healed }
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const positional = args.find(arg => !arg.startsWith('--'))
const root = positional ?? join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'sessions')

/** Yield every session artifact under `dir`. */
function* artifacts(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) yield* artifacts(path)
    else if (entry === 'session.jsonl.zstd' || entry === 'session.jsonl') yield path
  }
}

let scanned = 0
let touched = 0
let totalHealed = 0
for (const artifact of artifacts(root)) {
  scanned++
  const raw = readFileSync(artifact)
  const isZstd = artifact.endsWith('.zstd')
  let text
  try {
    text = isZstd ? decompressAllFrames(raw) : raw.toString('utf8')
  } catch (error) {
    console.error(`SKIP (${error.message}): ${artifact}`)
    continue
  }
  let framingBroken = false
  if (isZstd) {
    try {
      assertHeaderFrameLayout(raw)
    } catch {
      framingBroken = true
    }
  }
  const { text: healedText, healed } = healText(text)
  if (healed === 0 && !framingBroken) continue
  touched++
  totalHealed += healed
  const reason = [healed > 0 && `${healed} events`, framingBroken && 're-frame'].filter(Boolean).join(' + ')
  console.log(`${dryRun ? 'WOULD HEAL' : 'HEAL'} (${reason}): ${artifact}`)
  if (dryRun) continue
  let next = isZstd ? encodeContainer(healedText) : Buffer.from(healedText, 'utf8')
  if (isZstd) {
    try {
      assertHeaderFrameLayout(next)
      const roundTrip = decompressAllFrames(next)
      if (roundTrip !== healedText) throw new Error('round-trip mismatch')
    } catch (error) {
      console.error(`ABORT (${error.message}): ${artifact} left unchanged`)
      continue
    }
  }
  const tmp = `${artifact}.heal-tmp`
  writeFileSync(tmp, next)
  renameSync(tmp, artifact)
}
console.log(`\nscanned ${scanned} artifacts; ${touched} healed; ${totalHealed} events marked ignorable${dryRun ? ' (dry run)' : ''}`)
