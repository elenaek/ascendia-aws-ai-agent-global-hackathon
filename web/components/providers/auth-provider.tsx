'use client'

import { useEffect } from 'react'
import { Amplify } from 'aws-amplify'
import { Hub } from 'aws-amplify/utils'
import { useAuthStore } from '@/stores/auth-store'
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((state) => state.setUser)
  const setLoading = useAuthStore((state) => state.setLoading)

  useEffect(() => {
    // Configure Amplify
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
    const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'

    if (userPoolId && clientId) {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId,
            userPoolClientId: clientId,
            signUpVerificationMethod: 'code',
            loginWith: {
              email: true,
            },
          },
        },
      }, { ssr: true })
    }

    // Manually rehydrate the persisted store
    if (typeof window !== 'undefined') {
      useAuthStore.persist.rehydrate()
    }

    // Don't do auth check here - let the auth page handle login
  }, [])

  return <>{children}</>
}
