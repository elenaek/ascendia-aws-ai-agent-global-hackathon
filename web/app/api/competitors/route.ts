import { NextRequest, NextResponse } from 'next/server'
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getAuthenticatedDynamoDBClient, getCognitoIdentityId } from '@/lib/dynamodb-client'
import { getAuthFromRequest } from '@/lib/auth-middleware'

// Get table names from environment
const COMPETITORS_TABLE = process.env.DYNAMODB_COMPETITORS_TABLE || `competitors-${process.env.AWS_ACCOUNT_ID || '123456789012'}`
const COMPANY_COMPETITORS_TABLE = process.env.DYNAMODB_COMPANY_COMPETITORS_TABLE || `company-competitors-${process.env.AWS_ACCOUNT_ID || '123456789012'}`

/**
 * GET /api/competitors
 * Fetch all competitors for the logged-in user's company
 */
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

    // Get the Cognito identity ID (used as company_id)
    const identityId = await getCognitoIdentityId(auth.idToken)

    // Get authenticated DynamoDB client
    const docClient = await getAuthenticatedDynamoDBClient(auth.idToken)

    // Query the junction table to get all competitor IDs for this company
    const junctionResponse = await docClient.send(new QueryCommand({
      TableName: COMPANY_COMPETITORS_TABLE,
      KeyConditionExpression: 'company_id = :company_id',
      ExpressionAttributeValues: {
        ':company_id': identityId
      }
    }))

    const junctionItems = junctionResponse.Items || []

    // Fetch full competitor details for each competitor_id
    const competitors = []
    for (const item of junctionItems) {
      try {
        const competitorResponse = await docClient.send(new QueryCommand({
          TableName: COMPETITORS_TABLE,
          KeyConditionExpression: 'competitor_id = :competitor_id',
          ExpressionAttributeValues: {
            ':competitor_id': item.competitor_id
          },
          Limit: 1
        }))

        if (competitorResponse.Items && competitorResponse.Items.length > 0) {
          const competitor = competitorResponse.Items[0]
          competitors.push({
            id: competitor.competitor_id,
            name: competitor.company_name || '',
            category: item.category || 'Direct Competitors',
            website: competitor.product_url || competitor.website || '',
            description: competitor.product_description || competitor.description || '',
          })
        }
      } catch (error) {
        console.error(`Error fetching competitor ${item.competitor_id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      data: competitors
    })
  } catch (error) {
    console.error('Error fetching competitors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch competitors' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/competitors
 * Add a new competitor to the user's company
 */
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
    const {
      company_name,
      product_name,
      website,
      description,
      category
    } = body

    // Validate required fields
    if (!company_name || !product_name) {
      return NextResponse.json(
        { error: 'Missing required fields: company_name and product_name are required' },
        { status: 400 }
      )
    }

    // Get the Cognito identity ID (used as company_id)
    const identityId = await getCognitoIdentityId(auth.idToken)

    // Get authenticated DynamoDB client
    const docClient = await getAuthenticatedDynamoDBClient(auth.idToken)

    // Generate competitor ID
    const competitorId = `${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Create competitor record
    const competitorData = {
      competitor_id: competitorId,
      company_name,
      product_name,
      product_url: website || '',
      website: website || '',
      product_description: description || '',
      description: description || '',
      created_at: new Date().toISOString(),
    }

    await docClient.send(new PutCommand({
      TableName: COMPETITORS_TABLE,
      Item: competitorData,
    }))

    // Create junction table entry linking company to competitor
    const junctionData = {
      company_id: identityId,
      competitor_id: competitorId,
      category: category || 'Direct Competitors',
      added_at: new Date().toISOString(),
    }

    await docClient.send(new PutCommand({
      TableName: COMPANY_COMPETITORS_TABLE,
      Item: junctionData,
    }))

    return NextResponse.json({
      success: true,
      data: {
        id: competitorId,
        name: company_name,
        category: category || 'Direct Competitors',
        website: website || '',
        description: description || '',
      }
    })
  } catch (error) {
    console.error('Error saving competitor:', error)
    return NextResponse.json(
      { error: 'Failed to save competitor' },
      { status: 500 }
    )
  }
}
