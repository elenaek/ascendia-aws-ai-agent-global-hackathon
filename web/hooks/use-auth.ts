import { useEffect } from 'react'
import { fetchAuthSession, getCurrentUser, signIn, signOut, signUp } from 'aws-amplify/auth'
import { useAuthStore } from '@/stores/auth-store'

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, setLoading, logout } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      setLoading(true)

      // Check if Cognito is configured
      if (!process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || !process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID) {
        // No Cognito configured, skip auth check
        setUser(null)
        return
      }

      const currentUser = await getCurrentUser()
      const session = await fetchAuthSession()

      if (currentUser && session) {
        setUser({
          id: currentUser.userId,
          username: currentUser.username,
          email: currentUser.signInDetails?.loginId || '',
        })
      } else {
        setUser(null)
      }
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    try {
      const { isSignedIn } = await signIn({ username, password })
      if (isSignedIn) {
        await checkAuth()
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' }
    }
  }

  const register = async (username: string, email: string, password: string) => {
    try {
      await signUp({
        username,
        password,
        options: {
          userAttributes: { email },
        },
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Registration failed' }
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      logout()
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Logout failed' }
    }
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout: handleLogout,
    checkAuth,
  }
}
