import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAnalyticsStore } from './analytics-store'

interface User {
  id: string
  username: string
  email: string
  companyId?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

// Use persist but only for user and isAuthenticated, not isLoading
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false, // Start as false to prevent initial loading state
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),
      setLoading: (loading) => set({ isLoading: loading }),
      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        })
        // Clear analytics store (company data cache)
        useAnalyticsStore.getState().clearAll()
        // Clear session storage
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('auth-storage')
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }), // Only persist these fields
      skipHydration: true, // We'll manually hydrate
    }
  )
)
