"""
WebSocket helper for sending UI updates to connected clients.
"""
import boto3
import json
import os
from typing import Dict, Any, Optional, Literal

# AWS Configuration
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
AWS_ACCOUNT_ID = os.environ.get('AWS_ACCOUNT_ID', '738859113996')

# DynamoDB and API Gateway clients
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
apigateway_client = boto3.client('apigatewaymanagementapi', region_name=AWS_REGION)

# Table names (will be set from environment or defaults)
CONNECTIONS_TABLE_NAME = f"websocket-connections-{AWS_ACCOUNT_ID}"

# WebSocket API endpoint (will be set dynamically)
WEBSOCKET_API_ID = os.environ.get('WEBSOCKET_API_ID', '')
WEBSOCKET_ENDPOINT = f"https://{WEBSOCKET_API_ID}.execute-api.{AWS_REGION}.amazonaws.com/prod"


MessageType = Literal[
    "show_competitor_context",
    "show_insight",
    "show_notification",
    "update_competitor_panel",
    "show_progress",
    "highlight_element"
]


def get_connection_id_for_identity(identity_id: str) -> Optional[str]:
    """
    Query DynamoDB to find active connection_id for a given identity_id.

    Args:
        identity_id: Cognito Identity ID

    Returns:
        connection_id if found, None otherwise
    """
    try:
        table = dynamodb.Table(CONNECTIONS_TABLE_NAME)

        # Query using the GSI on identity_id
        response = table.query(
            IndexName='identity-index',
            KeyConditionExpression='identity_id = :identity_id',
            ExpressionAttributeValues={
                ':identity_id': identity_id
            },
            Limit=1,  # We only need one active connection
            ScanIndexForward=False  # Get the most recent one
        )

        items = response.get('Items', [])
        if items:
            return items[0]['connection_id']

        return None

    except Exception as e:
        print(f"Error querying connections table: {str(e)}")
        return None


def send_websocket_message(
    connection_id: str,
    message_type: MessageType,
    payload: Dict[str, Any]
) -> bool:
    """
    Send a message to a WebSocket connection.

    Args:
        connection_id: WebSocket connection ID
        message_type: Type of UI update message
        payload: Message payload

    Returns:
        True if successful, False otherwise
    """
    try:
        # Initialize API Gateway Management API client with the correct endpoint
        client = boto3.client(
            'apigatewaymanagementapi',
            endpoint_url=WEBSOCKET_ENDPOINT,
            region_name=AWS_REGION
        )

        # Construct the message
        import time
        message = {
            'type': message_type,
            'payload': payload,
            'timestamp': int(time.time() * 1000)  # Milliseconds since epoch
        }

        # Send the message
        client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(message).encode('utf-8')
        )

        print(f"Message sent to connection {connection_id}: {message_type}")
        return True

    except client.exceptions.GoneException:
        print(f"Connection {connection_id} is gone (stale)")
        # Optionally: Clean up stale connection from DynamoDB
        try:
            table = dynamodb.Table(CONNECTIONS_TABLE_NAME)
            table.delete_item(Key={'connection_id': connection_id})
        except Exception as cleanup_error:
            print(f"Error cleaning up stale connection: {str(cleanup_error)}")
        return False

    except Exception as e:
        print(f"Error sending WebSocket message: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def send_ui_update_to_identity(
    identity_id: str,
    message_type: MessageType,
    payload: Dict[str, Any]
) -> bool:
    """
    Send a UI update to a user identified by their Cognito Identity ID.

    Args:
        identity_id: Cognito Identity ID
        message_type: Type of UI update
        payload: Message payload

    Returns:
        True if successful, False otherwise
    """
    # Get the connection ID for this identity
    connection_id = get_connection_id_for_identity(identity_id)

    if not connection_id:
        print(f"No active WebSocket connection found for identity: {identity_id}")
        return False

    # Send the message
    return send_websocket_message(connection_id, message_type, payload)
