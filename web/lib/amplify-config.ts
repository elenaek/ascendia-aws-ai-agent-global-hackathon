import { Amplify } from 'aws-amplify'

export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
      signUpVerificationMethod: 'code' as const,
      loginWith: {
        email: true,
        username: true,
      },
    },
  },
}

export function configureAmplify() {
  Amplify.configure(amplifyConfig, { ssr: true })
}
