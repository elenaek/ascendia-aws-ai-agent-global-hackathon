import json
import logging
import os
import boto3
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize SSM client
ssm_client = boto3.client('ssm')

# Cache the auth value
_cached_auth = None

def get_dataforseo_auth():
    """Retrieve DataForSEO B64 auth from SSM Parameter Store with caching"""
    global _cached_auth

    if _cached_auth is not None:
        return _cached_auth

    param_name = os.environ.get('DATA_FOR_SEO_CREDS_B64')
    if not param_name:
        logger.error("DATA_FOR_SEO_CREDS_B64 environment variable not set")
        return None

    try:
        response = ssm_client.get_parameter(Name=param_name, WithDecryption=True)
        _cached_auth = response['Parameter']['Value']
        logger.info("Successfully retrieved DataForSEO auth from SSM")
        return _cached_auth
    except ClientError as e:
        logger.error(f"Error retrieving SSM parameter: {e}")
        return None

def handler(event, context):
    """
    Lambda function handler for webhook endpoint

    Args:
        event: Lambda Function URL event
        context: Lambda context object

    Returns:
        Lambda Function URL response
    """
    try:
        # Log the incoming event
        logger.info(f"Received event: {json.dumps(event)}")

        # Extract headers (case-insensitive)
        headers = {k.lower(): v for k, v in event.get('headers', {}).items()}
        logger.info(f"Headers: {json.dumps(headers)}")

        # Parse the request body if present
        body = None
        if event.get('body'):
            try:
                body = json.loads(event['body'])
                logger.info(f"Parsed body: {json.dumps(body)}")
            except json.JSONDecodeError:
                logger.warning("Request body is not valid JSON")
                body = event['body']

        # Get DataForSEO auth for making API calls
        dataforseo_auth = get_dataforseo_auth()
        if not dataforseo_auth:
            logger.error("Failed to retrieve DataForSEO auth credentials")

        # Process webhook based on type/source
        response_message = process_dataforseo_webhook(body, headers, dataforseo_auth)

        # Return successful response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': response_message,
                'received': True
            })
        }

    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }

def process_dataforseo_webhook(body, headers, auth_b64):
    """
    Process DataForSEO webhooks

    Args:
        body: Webhook payload
        headers: Request headers
        auth_b64: Base64 encoded auth string for DataForSEO API calls
    """
    logger.info(f"Processing DataForSEO webhook: {body}")

    # Example: Use auth_b64 for making DataForSEO API calls
    # headers_for_api = {
    #     'Authorization': f'Basic {auth_b64}',
    #     'Content-Type': 'application/json'
    # }
    # response = requests.post('https://api.dataforseo.com/v3/...', headers=headers_for_api, json=data)

    return "DataForSEO webhook processed successfully"
