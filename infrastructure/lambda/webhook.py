import json
import logging
import os
import boto3
import requests
from botocore.exceptions import ClientError

data_for_seo_url_get_task = "https://api.dataforseo.com/v3/business_data/trustpilot/reviews/task_get/{task_id}"

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize SSM client
ssm_client = boto3.client('ssm')

# Cache the auth value
_cached_auth = None
_cached_connection_string = None
_cached_db_name = None

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

def get_mongo_connection_string():
    """Retrieve Mongo Connection String from SSM Parameter Store with caching"""
    global _cached_connection_string

    if _cached_connection_string is not None:
        return _cached_connection_string

    param_name = os.environ.get('MONGO_CONNECTION_STRING')
    if not param_name:
        logger.error("MONGO_CONNECTION_STRING environment variable not set")
        return None

    try:
        response = ssm_client.get_parameter(Name=param_name, WithDecryption=True)
        _cached_connection_string = response['Parameter']['Value']
        logger.info("Successfully retrieved Mongo Connection String from SSM")
        return _cached_connection_string
    except ClientError as e:
        logger.error(f"Error retrieving SSM parameter: {e}")
        return None

def get_mongo_db_name():
    """Retrieve Mongo DB Name from SSM Parameter Store with caching"""
    global _cached_db_name

    if _cached_db_name is not None:
        return _cached_db_name

    param_name = os.environ.get('MONGO_DB_NAME')
    if not param_name:
        logger.error("MONGO_DB_NAME environment variable not set")
        return None

    try:
        response = ssm_client.get_parameter(Name=param_name)
        _cached_db_name = response['Parameter']['Value']
        logger.info("Successfully retrieved Mongo DB Name from SSM")
        return _cached_db_name
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
        # Log the entire incoming event for debugging
        logger.info(f"Full event received: {json.dumps(event, default=str)}")

        # Extract query parameters
        query_params = event.get('queryStringParameters') or {}
        logger.info(f"Query String Parameters: {json.dumps(query_params)}")

        # Also check for rawQueryString
        raw_query = event.get('rawQueryString', '')
        if raw_query:
            logger.info(f"Raw Query String: {raw_query}")

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

        # Get Mongo Connection String for storing reviews
        mongo_connection_string = get_mongo_connection_string()
        if not mongo_connection_string:
            logger.error("Failed to retrieve Mongo Connection String")

        # Get Mongo DB Name for storing reviews
        mongo_db_name = get_mongo_db_name()
        if not mongo_db_name:
            logger.error("Failed to retrieve Mongo DB Name")

        # Process webhook based on type/source
        response_message = process_dataforseo_webhook(body, headers, query_params, dataforseo_auth, mongo_connection_string, mongo_db_name)

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

def process_dataforseo_webhook(query_params, auth_b64, mongo_connection_string, mongo_db_name):
    """
    Process DataForSEO webhooks

    Args:
        query_params: Query string parameters
        auth_b64: Base64 encoded auth string for DataForSEO API calls
        mongo_connection_string: Mongo Connection String for storing reviews
        mongo_db_name: Mongo DB Name for storing reviews
    """
    logger.info(f"Processing DataForSEO webhook")
    logger.info(f"Query Params: {query_params}")
    params = json.loads(query_params)
    task_id = params.get("task_id")
    company_id = params.get("cid")

    url = data_for_seo_url_get_task.format(task_id=task_id)
    headers = {
        "Authorization": f"Basic {auth_b64}",
        "Content-Type": "application/json"
    }
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        logger.error(f"Failed to get task: {response.text}")
        return "Failed to get task"
    body = response.json()
    logger.info(f"Task body: {body}")
    reviews = body["tasks"][0]["result"]
    parsed_reviews = [map(lambda review: {"rank": review["rank_absolute"],"reviewer_review_count": review["user_profile"]["reviews_count"], "reviewer_name": review["reviewer_name"], "review_text": review["review_text"], "rating": review["rating"], "date": review["date"]}, reviews)]


    # return body["tasks"][0]["result"]
    # Example: Use auth_b64 for making DataForSEO API calls
    # headers_for_api = {
    #     'Authorization': f'Basic {auth_b64}',
    #     'Content-Type': 'application/json'
    # }
    # response = requests.post('https://api.dataforseo.com/v3/...', headers=headers_for_api, json=data)

    return "DataForSEO webhook processed successfully"
