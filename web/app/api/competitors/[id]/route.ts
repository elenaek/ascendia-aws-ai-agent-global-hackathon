import { NextRequest, NextResponse } from 'next/server'
import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getAuthenticatedDynamoDBClient, getCognitoIdentityId } from '@/lib/dynamodb-client'
import { getAuthFromRequest } from '@/lib/auth-middleware'

// Get table names from environment
const COMPANY_COMPETITORS_TABLE = process.env.DYNAMODB_COMPANY_COMPETITORS_TABLE || `company-competitors-${process.env.AWS_ACCOUNT_ID || '123456789012'}`

/**
 * DELETE /api/competitors/[id]
 * Remove a competitor from the user's company
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const competitorId = id

    if (!competitorId) {
      return NextResponse.json(
        { error: 'Competitor ID is required' },
        { status: 400 }
      )
    }

    // Get the Cognito identity ID (used as company_id)
    const identityId = await getCognitoIdentityId(auth.idToken)

    // Get authenticated DynamoDB client
    const docClient = await getAuthenticatedDynamoDBClient(auth.idToken)

    // Delete the junction table entry
    // This removes the relationship between the company and competitor
    // The competitor record itself remains for other users
    await docClient.send(new DeleteCommand({
      TableName: COMPANY_COMPETITORS_TABLE,
      Key: {
        company_id: identityId,
        competitor_id: competitorId,
      },
    }))

    return NextResponse.json({
      success: true,
      message: 'Competitor removed successfully'
    })
  } catch (error) {
    console.error('Error removing competitor:', error)
    return NextResponse.json(
      { error: 'Failed to remove competitor' },
      { status: 500 }
    )
  }
}
