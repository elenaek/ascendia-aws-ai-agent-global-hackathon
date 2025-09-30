'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Authenticator, useAuthenticator, Theme, ThemeProvider } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import './auth.css'
import { useAuthStore } from '@/stores/auth-store'
import { useOnboardingStore } from '@/stores/onboarding-store'

const customTheme: Theme = {
  name: 'ascendia-theme',
  tokens: {
    colors: {
      background: {
        primary: 'hsl(222.2, 84%, 4.9%)',
        secondary: 'hsl(217.2, 32.6%, 17.5%)',
      },
      font: {
        primary: 'hsl(210, 40%, 98%)',
        secondary: 'hsl(215, 20.2%, 65.1%)',
      },
      brand: {
        primary: {
          10: 'hsl(190, 100%, 90%)',
          20: 'hsl(190, 100%, 80%)',
          40: 'hsl(190, 100%, 60%)',
          60: 'hsl(190, 100%, 50%)',
          80: 'hsl(190, 100%, 40%)',
          90: 'hsl(190, 100%, 30%)',
          100: 'hsl(190, 100%, 20%)',
        },
      },
    },
    components: {
      button: {
        primary: {
          backgroundColor: 'hsl(190, 100%, 50%)',
          color: 'hsl(222.2, 47.4%, 11.2%)',
          _hover: {
            backgroundColor: 'hsl(190, 100%, 40%)',
          },
        },
      },
    },
  },
}

function AuthContent() {
  const router = useRouter()
  const { authStatus, user: amplifyUser } = useAuthenticator((context) => [context.authStatus, context.user])
  const { setUser } = useAuthStore()
  const { isOnboarded } = useOnboardingStore()

  useEffect(() => {
    const updateAuthState = async () => {
      if (authStatus === 'authenticated' && amplifyUser) {
        console.log('User authenticated, updating store:', amplifyUser)
        console.log('Auth details:', {
          userId: amplifyUser.userId,
          username: amplifyUser.username,
          signInDetails: amplifyUser.signInDetails,
        })

        // For email-based login, username might be the email
        const email = amplifyUser.signInDetails?.loginId || amplifyUser.username || ''

        // Update the Zustand store with the authenticated user
        setUser({
          id: amplifyUser.userId || email,
          username: email, // Use email as username for email-based auth
          email: email,
        })

        console.log('User set in store, checking onboarding status...')

        // Check if user has completed onboarding
        if (isOnboarded) {
          console.log('User already onboarded, redirecting to dashboard...')
          router.push('/dashboard')
        } else {
          console.log('User not onboarded, redirecting to onboarding...')
          router.push('/onboarding')
        }
      }
    }

    updateAuthState()
  }, [authStatus, amplifyUser, router, setUser, isOnboarded])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-primary text-glow mb-4">
            Ascendia
          </h1>
          <p className="text-muted-foreground">
            AI-Powered Business Intelligence
          </p>
        </div>

        <div className="bg-panel border border-primary/20 rounded-lg p-8 glow">
          <ThemeProvider theme={customTheme}>
            <Authenticator
              loginMechanisms={['email']}
              signUpAttributes={[]}
            />
          </ThemeProvider>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Authenticator.Provider>
      <AuthContent />
    </Authenticator.Provider>
  )
}
