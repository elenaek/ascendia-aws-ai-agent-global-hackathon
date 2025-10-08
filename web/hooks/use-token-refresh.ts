import { useEffect, useRef } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { useAuthStore } from '@/stores/auth-store'

// Refresh token 5 minutes before it expires
const REFRESH_BUFFER_MS = 5 * 60 * 1000

export function useTokenRefresh() {
  const { isAuthenticated } = useAuthStore()
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const scheduleTokenRefresh = async () => {
    try {
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      // Get current session
      const session = await fetchAuthSession({ forceRefresh: false })

      if (!session?.tokens?.accessToken) {
        return
      }

      // Get token expiration time
      const expiresAt = session.tokens.accessToken.payload.exp
      if (!expiresAt) {
        return
      }

      // Calculate when to refresh (in milliseconds)
      const expirationTime = expiresAt * 1000 // Convert to milliseconds
      const currentTime = Date.now()
      const timeUntilExpiration = expirationTime - currentTime
      const refreshTime = timeUntilExpiration - REFRESH_BUFFER_MS

      // If token is already expired or about to expire, refresh immediately
      if (refreshTime <= 0) {
        await refreshToken()
        return
      }

      // Schedule the refresh
      refreshTimeoutRef.current = setTimeout(async () => {
        await refreshToken()
      }, refreshTime)

      console.log(`Token refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes`)
    } catch (error) {
      console.error('Error scheduling token refresh:', error)
    }
  }

  const refreshToken = async () => {
    try {
      console.log('Refreshing auth token...')

      // Force refresh the session
      await fetchAuthSession({ forceRefresh: true })

      console.log('Token refreshed successfully')

      // Schedule the next refresh
      await scheduleTokenRefresh()
    } catch (error) {
      console.error('Error refreshing token:', error)

      // Retry after 1 minute if refresh fails
      refreshTimeoutRef.current = setTimeout(async () => {
        await refreshToken()
      }, 60 * 1000)
    }
  }

  useEffect(() => {
    // Only run token refresh if user is authenticated
    if (!isAuthenticated) {
      // Clear any existing timeout if user logs out
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
      return
    }

    // Start the refresh cycle
    scheduleTokenRefresh()

    // Also refresh on window focus (in case user comes back after a long time)
    const handleFocus = () => {
      if (isAuthenticated) {
        scheduleTokenRefresh()
      }
    }

    window.addEventListener('focus', handleFocus)

    // Cleanup
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
      window.removeEventListener('focus', handleFocus)
    }
  }, [isAuthenticated])

  return { refreshToken }
}
