import { NextRequest } from 'next/server'

/**
 * Extract and validate the authentication token from the request
 * @param request - The Next.js request object
 * @returns The ID token and identity ID if authenticated, null otherwise
 */
export async function getAuthFromRequest(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const idToken = authHeader.slice(7) // Remove 'Bearer ' prefix

    if (!idToken) {
      return null
    }

    return { idToken }
  } catch (error) {
    console.error('Error validating auth token:', error)
    return null
  }
}

/**
 * Middleware to protect API routes
 * @param handler - The route handler function
 * @returns Protected route handler
 */
export function withAuth(
  handler: (request: NextRequest, context?: { auth: { idToken: string } }) => Promise<Response>
) {
  return async (request: NextRequest, context?: { auth: { idToken: string } }) => {
    const auth = await getAuthFromRequest(request)

    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Pass the auth info to the handler
    return handler(request, { ...context, auth })
  }
}