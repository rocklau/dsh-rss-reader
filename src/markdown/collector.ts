import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, posix } from 'node:path'
import type { FetchQueue } from '../rss/httpClient.ts'
import { queuedFetch } from '../rss/httpClient.ts'
import { parseSourceUrlFromFrontmatter, safeFileName } from '../utils.ts'
import { USER_AGENT } from '../constants.ts'

const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g

function isAlreadyCollected(rawUrl: string, assetsDirName: string): boolean {
  const normalized = String(rawUrl || '').replace(/\\/g, '/')
  return normalized.startsWith(`${assetsDirName}/`) || normalized.startsWith(`./${assetsDirName}/`)
}

function resolveResourceUrl(rawUrl: string, sourceUrl: string | null): string | null {
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl
  if (!sourceUrl) return null
  try {
    return new URL(rawUrl, sourceUrl).toString()
  } catch {
    return null
  }
}

function pickExtension(contentType: string | null, resourceUrl: string): string {
  const type = (contentType || '').toLowerCase()
  if (type.includes('image/jpeg')) return '.jpg'
  if (type.includes('image/png')) return '.png'
  if (type.includes('image/gif')) return '.gif'
  if (type.includes('image/webp')) return '.webp'
  if (type.includes('image/svg+xml')) return '.svg'
  if (type.includes('image/avif')) return '.avif'
  try {
    return extname(new URL(resourceUrl).pathname || '').toLowerCase() || ''
  } catch {
    return ''
  }
}

interface ImageMatch {
  fullMatch: string
  altText: string
  rawUrl: string
  title: string
  resolvedUrl: string
}

function collectImageMatches(markdown: string, assetsDirName: string, sourceUrl: string | null): { matches: ImageMatch[]; stats: { totalImageLinks: number; alreadyCollected: number; unresolvedRelative: number } } {
  const matches: ImageMatch[] = []
  const stats = { totalImageLinks: 0, alreadyCollected: 0, unresolvedRelative: 0 }

  for (const match of markdown.matchAll(IMAGE_REGEX)) {
    const [fullMatch, altText, rawUrl, title] = match
    stats.totalImageLinks += 1
    if (fullMatch === undefined || rawUrl === undefined) continue

    if (isAlreadyCollected(rawUrl, assetsDirName)) {
      stats.alreadyCollected += 1
      continue
    }

    const resolvedUrl = resolveResourceUrl(rawUrl, sourceUrl)
    if (!resolvedUrl) {
      stats.unresolvedRelative += 1
      continue
    }

    matches.push({ fullMatch, altText: altText ?? '', rawUrl, title: title ?? '', resolvedUrl })
  }

  return { matches, stats }
}

async function ensureLocalAsset(
  fetchQueue: FetchQueue,
  options: { resolvedUrl: string; altText: string; assetsDir: string; assetsDirName: string },
): Promise<string> {
  const { resolvedUrl, altText, assetsDir, assetsDirName } = options
  const urlHash = createHash('md5').update(resolvedUrl).digest('hex').slice(0, 12)

  const existing = readdirSync(assetsDir).find(file => file.includes(`-${urlHash}`))
  if (existing) {
    return posix.join(assetsDirName, existing)
  }

  const res = await queuedFetch(fetchQueue, resolvedUrl, {
    headers: { 'User-Agent': USER_AGENT },
    retries: 2,
  })
  const extension = pickExtension(res.headers.get('content-type'), resolvedUrl)
  const baseName = safeFileName(altText || 'image') || 'image'
  const filename = `${baseName}-${urlHash}${extension}`
  writeFileSync(join(assetsDir, filename), Buffer.from(await res.arrayBuffer()))
  return posix.join(assetsDirName, filename)
}

/**
 * Download images referenced by a materialized markdown file into a sibling
 * `<basename>-assets/` directory and rewrite the markdown to local paths.
 * MD5-hash dedupe keeps repeated URLs as one file.
 */
export async function downloadResources(
  fetchQueue: FetchQueue,
  markdownPath: string,
  articleId: string,
): Promise<void> {
  if (!markdownPath || !existsSync(markdownPath)) {
    console.log(`[Collector] Markdown file not found: ${markdownPath}`)
    return
  }

  const content = readFileSync(markdownPath, 'utf-8')
  const sourceUrl = parseSourceUrlFromFrontmatter(content)

  const articleDir = dirname(markdownPath)
  const assetsDirName = `${basename(markdownPath, '.md')}-assets`
  const assetsDir = join(articleDir, assetsDirName)

  const { matches: imageMatches, stats } = collectImageMatches(content, assetsDirName, sourceUrl)
  if (imageMatches.length === 0) {
    console.log(
      `[Collector] Skipped article ${articleId}: no collectable images (total=${stats.totalImageLinks}, localized=${stats.alreadyCollected}, unresolved=${stats.unresolvedRelative})`,
    )
    return
  }

  if (!existsSync(assetsDir)) {
    mkdirSync(assetsDir, { recursive: true })
  }

  const resolvedToLocal = new Map<string, string>()
  for (const item of imageMatches) {
    if (resolvedToLocal.has(item.resolvedUrl)) continue
    try {
      const localPath = await ensureLocalAsset(fetchQueue, {
        resolvedUrl: item.resolvedUrl,
        altText: item.altText,
        assetsDir,
        assetsDirName,
      })
      resolvedToLocal.set(item.resolvedUrl, localPath)
    } catch (error) {
      console.error(`[Collector] Failed to download ${item.resolvedUrl}:`, (error as Error).message)
    }
  }

  let updatedContent = content
  for (const item of imageMatches) {
    const localPath = resolvedToLocal.get(item.resolvedUrl)
    if (!localPath) continue
    const titlePart = item.title ? ` "${item.title}"` : ''
    updatedContent = updatedContent.replace(item.fullMatch, `![${item.altText}](${localPath}${titlePart})`)
  }

  if (updatedContent !== content) {
    writeFileSync(markdownPath, updatedContent, 'utf-8')
  } else {
    console.log(`[Collector] Skipped markdown rewrite for ${articleId}: no content changes`)
  }
}
