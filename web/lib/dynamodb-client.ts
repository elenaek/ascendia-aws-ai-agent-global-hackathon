import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity'
import { CognitoIdentityClient, GetIdCommand } from '@aws-sdk/client-cognito-identity'

/**
 * Get a DynamoDB client configured with Cognito credentials for row-level security
 * @param idToken - The Cognito ID token from the authenticated user
 * @returns Configured DynamoDB document client
 */
export async function getAuthenticatedDynamoDBClient(idToken: string) {
  const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID
  const identityPoolId = process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID

  if (!identityPoolId || !userPoolId) {
    throw new Error('Missing Cognito configuration')
  }

  // Create credentials provider using the identity pool
  const credentials = fromCognitoIdentityPool({
    client: new CognitoIdentityClient({ region }),
    identityPoolId,
    logins: {
      [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: idToken,
    },
  })

  // Create DynamoDB client with Cognito credentials
  const client = new DynamoDBClient({
    region,
    credentials,
  })

  return DynamoDBDocumentClient.from(client)
}

/**
 * Get the Cognito identity ID from the ID token
 * This is used as the partition key for row-level security
 */
export async function getCognitoIdentityId(idToken: string): Promise<string> {
  const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID
  const identityPoolId = process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID

  if (!identityPoolId || !userPoolId) {
    throw new Error('Missing Cognito configuration')
  }

  const cognitoIdentity = new CognitoIdentityClient({ region })

  // Get the identity ID for this user
  const getIdCommand = new GetIdCommand({
    IdentityPoolId: identityPoolId,
    Logins: {
      [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: idToken,
    },
  })

  const { IdentityId } = await cognitoIdentity.send(getIdCommand)

  if (!IdentityId) {
    throw new Error('Failed to get Cognito identity ID')
  }

  return IdentityId
}