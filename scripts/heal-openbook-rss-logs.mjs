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
 * Artifacts use a concatenated-zstd-frame container (each durable flush is
 * one independently decodable frame). Frames are located with the same
 * structural scan the harness backend uses, decompressed individually,
 * healed as plaintext JSONL, and rewritten as one fresh complete frame —
 * a valid member of that container format.
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
    void constants // zlib import documents the codec pairing; scanner itself is pure bytes
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
  let text
  try {
    text = artifact.endsWith('.zstd') ? decompressAllFrames(raw) : raw.toString('utf8')
  } catch (error) {
    console.error(`SKIP (${error.message}): ${artifact}`)
    continue
  }
  const { text: healedText, healed } = healText(text)
  if (healed === 0) continue
  touched++
  totalHealed += healed
  console.log(`${dryRun ? 'WOULD HEAL' : 'HEAL'} ${healed} events: ${artifact}`)
  if (dryRun) continue
  const tmp = `${artifact}.heal-tmp`
  writeFileSync(tmp, artifact.endsWith('.zstd') ? zstdCompressSync(Buffer.from(healedText, 'utf8')) : healedText)
  renameSync(tmp, artifact)
}
console.log(`\nscanned ${scanned} artifacts; ${touched} healed; ${totalHealed} events marked ignorable${dryRun ? ' (dry run)' : ''}`)
