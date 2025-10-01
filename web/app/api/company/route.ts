import { NextRequest, NextResponse } from 'next/server'
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getAuthenticatedDynamoDBClient, getCognitoIdentityId } from '@/lib/dynamodb-client'
import { getAuthFromRequest } from '@/lib/auth-middleware'

// Get the table name from environment or use default
const COMPANIES_TABLE = process.env.DYNAMODB_COMPANIES_TABLE || `companies-${process.env.AWS_ACCOUNT_ID || '123456789012'}`

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { companyName, companyWebsite, companyDescription } = body

    if (!companyName || !companyWebsite) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the Cognito identity ID (used as partition key for row-level security)
    const identityId = await getCognitoIdentityId(auth.idToken)

    // Get authenticated DynamoDB client
    const docClient = await getAuthenticatedDynamoDBClient(auth.idToken)

    const companyData = {
      company_id: identityId, // Use Cognito identity ID for row-level security
      name: companyName,
      website: companyWebsite,
      description: companyDescription || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Save to DynamoDB
    await docClient.send(new PutCommand({
      TableName: COMPANIES_TABLE,
      Item: companyData,
    }))

    return NextResponse.json({
      success: true,
      data: companyData
    })
  } catch (error) {
    console.error('Error saving company data:', error)
    return NextResponse.json(
      { error: 'Failed to save company data' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the Cognito identity ID
    const identityId = await getCognitoIdentityId(auth.idToken)

    // Get authenticated DynamoDB client
    const docClient = await getAuthenticatedDynamoDBClient(auth.idToken)

    // Fetch from DynamoDB using the identity ID
    const result = await docClient.send(new GetCommand({
      TableName: COMPANIES_TABLE,
      Key: {
        company_id: identityId
      },
    }))

    if (!result.Item) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.Item
    })
  } catch (error) {
    console.error('Error fetching company data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company data' },
      { status: 500 }
    )
  }
}