import { fetchAuthSession } from 'aws-amplify/auth'

/**
 * Get the current user's ID token for authenticated API requests
 * @returns The ID token if authenticated, null otherwise
 */
export async function getIdToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession()
    const idToken = session.tokens?.idToken?.toString()
    return idToken || null
  } catch (error) {
    console.error('Error getting ID token:', error)
    return null
  }
}

/**
 * Get the current user's access token for authenticated API requests
 * @returns The access token if authenticated, null otherwise
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession()
    const accessToken = session.tokens?.accessToken?.toString()
    return accessToken || null
  } catch (error) {
    console.error('Error getting access token:', error)
    return null
  }
}

/**
 * Make an authenticated API request with the user's ID token
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns The fetch response
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const idToken = await getIdToken()

  if (!idToken) {
    throw new Error('Not authenticated')
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${idToken}`,
  }

  return fetch(url, {
    ...options,
    headers,
  })
}