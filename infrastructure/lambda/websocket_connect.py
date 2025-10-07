"""
WebSocket API Gateway $connect handler.
Stores connection_id and identity_id in DynamoDB when a client connects.
"""
import json
import os
import time
import boto3
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table_name = os.environ['CONNECTIONS_TABLE']
table = dynamodb.Table(table_name)

# TTL: 2 hours from now (WebSocket connections auto-close, but this ensures cleanup)
CONNECTION_TTL_SECONDS = 7200


def handler(event, context):
    """
    Handle WebSocket $connect route.
    Extract identity_id from IAM auth context and store connection.

    Args:
        event: API Gateway WebSocket event
        context: Lambda context

    Returns:
        Response with statusCode 200 for success, 500 for error
    """
    try:
        connection_id = event['requestContext']['connectionId']

        # Extract identity_id from IAM authorization context
        # When using IAM auth with Cognito Identity Pool, the identity is in the context
        identity_context = event['requestContext'].get('identity', {})

        # The Cognito Identity ID is in the cognitoIdentityId field
        identity_id = identity_context.get('cognitoIdentityId')

        if not identity_id:
            print(f"No identity_id found in request context: {json.dumps(identity_context)}")
            return {
                'statusCode': 401,
                'body': json.dumps({'message': 'Unauthorized: No identity found'})
            }

        # Calculate TTL (current time + 2 hours)
        ttl = int(time.time()) + CONNECTION_TTL_SECONDS

        # Store connection in DynamoDB
        table.put_item(
            Item={
                'connection_id': connection_id,
                'identity_id': identity_id,
                'timestamp': Decimal(str(time.time())),
                'ttl': ttl,
            }
        )

        print(f"Connection established: {connection_id} for identity: {identity_id}")

        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Connected'})
        }

    except Exception as e:
        print(f"Error in $connect handler: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error'})
        }
