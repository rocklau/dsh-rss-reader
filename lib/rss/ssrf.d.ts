/** Whether an IP address is a private / link-local / reserved address. */
export declare function isPrivateIp(ip: string): boolean;
export interface UrlValidationResult {
    ok: boolean;
    reason: string;
}
/**
 * Validate a feed URL against SSRF: http(s) only, and (unless private feeds
 * are allowed) no DNS-resolved private-network addresses.
 * @param url - candidate feed URL.
 * @param allowPrivate - bypass the private-network block.
 * @returns ok plus a human reason.
 */
export declare function validateHttpUrl(url: string, allowPrivate: boolean): Promise<UrlValidationResult>;
