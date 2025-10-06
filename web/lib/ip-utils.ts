/**
 * IP address utilities for whitelist checking
 */

/**
 * Check if an IP address is in a given CIDR range
 */
export function isIPInCIDR(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/')

  if (!bits) {
    // Not a CIDR, just a single IP
    return ip === cidr
  }

  const mask = -1 << (32 - parseInt(bits))
  const ipNum = ipToNumber(ip)
  const rangeNum = ipToNumber(range)

  return (ipNum & mask) === (rangeNum & mask)
}

/**
 * Convert IP address string to number
 */
function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0
}

/**
 * Check if an IP is in the whitelist
 */
export function isIPWhitelisted(ip: string, whitelist: string[]): boolean {
  if (!whitelist || whitelist.length === 0) {
    // No whitelist means allow all
    return true
  }

  // Check if IP matches any entry in whitelist
  return whitelist.some(entry => {
    const trimmedEntry = entry.trim()
    if (!trimmedEntry) return false

    // Check if it's a CIDR range or exact match
    return isIPInCIDR(ip, trimmedEntry)
  })
}

/**
 * Parse the ALLOWED_IPS environment variable
 */
export function parseAllowedIPs(envVar: string | undefined): string[] {
  if (!envVar || envVar.trim() === '') {
    return []
  }

  return envVar.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0)
}
