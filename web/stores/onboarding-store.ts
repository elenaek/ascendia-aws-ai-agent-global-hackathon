import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingState {
  isOnboarded: boolean
  displayName: string | null
  setOnboarded: (displayName: string) => void
  resetOnboarding: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      isOnboarded: false,
      displayName: null,
      setOnboarded: (displayName) =>
        set({
          isOnboarded: true,
          displayName,
        }),
      resetOnboarding: () =>
        set({
          isOnboarded: false,
          displayName: null,
        }),
    }),
    {
      name: 'onboarding-storage',
    }
  )
)