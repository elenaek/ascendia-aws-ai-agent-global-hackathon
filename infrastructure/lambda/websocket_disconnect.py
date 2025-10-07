"""
WebSocket API Gateway $disconnect handler.
Removes connection_id from DynamoDB when a client disconnects.
"""
import json
import os
import boto3

dynamodb = boto3.resource('dynamodb')
table_name = os.environ['CONNECTIONS_TABLE']
table = dynamodb.Table(table_name)


def handler(event, context):
    """
    Handle WebSocket $disconnect route.
    Remove connection from DynamoDB.

    Args:
        event: API Gateway WebSocket event
        context: Lambda context

    Returns:
        Response with statusCode 200 for success, 500 for error
    """
    try:
        connection_id = event['requestContext']['connectionId']

        # Remove connection from DynamoDB
        table.delete_item(
            Key={
                'connection_id': connection_id
            }
        )

        print(f"Connection disconnected: {connection_id}")

        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Disconnected'})
        }

    except Exception as e:
        print(f"Error in $disconnect handler: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error'})
        }
