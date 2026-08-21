import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/** Whether an IP address is a private / link-local / reserved address. */
export function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const parts = ip.split('.').map(n => parseInt(n, 10))
    const a = parts[0]!
    const b = parts[1]!
    if (a === 10) return true
    if (a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 0) return true
    return false
  }
  if (isIP(ip) === 6) {
    const value = ip.toLowerCase()
    if (value === '::1') return true
    if (value.startsWith('fe80:')) return true
    if (value.startsWith('fc') || value.startsWith('fd')) return true
    return false
  }
  return true
}

export interface UrlValidationResult {
  ok: boolean
  reason: string
}

/**
 * Validate a feed URL against SSRF: http(s) only, and (unless private feeds
 * are allowed) no DNS-resolved private-network addresses.
 * @param url - candidate feed URL.
 * @param allowPrivate - bypass the private-network block.
 * @returns ok plus a human reason.
 */
export async function validateHttpUrl(url: string, allowPrivate: boolean): Promise<UrlValidationResult> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, reason: 'Invalid URL' }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, reason: 'Only http/https URLs are allowed' }
  }

  if (allowPrivate) return { ok: true, reason: '' }

  try {
    const addrs = await lookup(parsed.hostname, { all: true })
    if (addrs.some(addr => isPrivateIp(addr.address))) {
      return { ok: false, reason: 'Blocked private network address (set allowPrivateFeeds=true to allow)' }
    }
  } catch {
    return { ok: false, reason: 'DNS lookup failed' }
  }

  return { ok: true, reason: '' }
}
