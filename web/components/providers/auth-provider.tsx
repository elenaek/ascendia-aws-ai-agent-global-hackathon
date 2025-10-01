'use client'

import { useEffect } from 'react'
import { Amplify } from 'aws-amplify'
import { useAuthStore } from '@/stores/auth-store'

export function AuthProvider({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    // Configure Amplify
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
    const identityPoolId = process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID

    if (userPoolId && clientId) {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId,
            userPoolClientId: clientId,
            identityPoolId: identityPoolId || '',
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
