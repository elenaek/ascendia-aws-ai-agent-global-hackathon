import { NextRequest, NextResponse } from 'next/server'
import { isIPWhitelisted, parseAllowedIPs } from './lib/ip-utils'

export function middleware(request: NextRequest) {
  // Get the ALLOWED_IPS environment variable
  const allowedIPsEnv = process.env.ALLOWED_IPS
  const allowedIPs = parseAllowedIPs(allowedIPsEnv)

  // If no whitelist is configured, allow all traffic
  if (allowedIPs.length === 0) {
    return NextResponse.next()
  }

  // Get client IP address
  // Check various headers for the real IP (considering proxies, CDNs, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip') // Cloudflare

  // Extract IP address (prefer x-forwarded-for, then x-real-ip, then cf-connecting-ip)
  let clientIP = forwardedFor?.split(',')[0].trim() || realIP || cfConnectingIP || request.ip

  // Fallback for local development
  if (!clientIP || clientIP === '::1' || clientIP === '127.0.0.1') {
    // In development, treat localhost as allowed by default
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next()
    }
    clientIP = '127.0.0.1'
  }

  // Check if IP is whitelisted
  if (!isIPWhitelisted(clientIP, allowedIPs)) {
    console.log(`[IP Whitelist] Blocked access from IP: ${clientIP}`)

    // Redirect to blocked page
    return NextResponse.redirect(new URL('/blocked', request.url))
  }

  // IP is whitelisted, allow the request
  return NextResponse.next()
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /blocked (the blocked page itself)
     * - /_next/static (static files)
     * - /_next/image (image optimization files)
     * - /favicon.ico (favicon file)
     * - /public folder
     */
    '/((?!blocked|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
