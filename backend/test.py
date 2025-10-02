# import boto3
# from dotenv import load_dotenv
# from shared.database.dynamodb_repo import DynamoDBRepository

# load_dotenv()

# def get_company_info(identity_id: str) -> dict:
#     """
#     Fetch company information from DynamoDB using the Cognito identity ID.
#     Args:
#         identity_id: The Cognito identity ID from the JWT token
#     Returns:
#         dict: Company information
#     """
#     response = DynamoDBRepository().get_company(company_id=identity_id)
#     print(response)
#     # return response.get('Item', None)

# get_company_info('68db18fe5d04ff1311963dea')

import requests
import urllib.parse
import json
import os
from dotenv import load_dotenv
load_dotenv()

# Configuration Constants
REGION_NAME = "us-east-1"
RUNTIME_SESSION_ID = "zzzwfzzwwfwfwwwfffgmfdzzreffakdlzgzzfdmrkleafremoigrmtezsorskhmtkrlshmt"

# === Agent Invocation Demo ===
invoke_agent_arn = "arn:aws:bedrock-agentcore:us-east-1:738859113996:runtime/business_analyst-qZQaYvFl4b"
auth_token = os.environ.get('AGENTCORE_TOKEN')
print(f"Using Agent ARN from environment: {invoke_agent_arn}")

# URL encode the agent ARN
escaped_agent_arn = urllib.parse.quote(invoke_agent_arn, safe='')

# Construct the URL
url = f"https://bedrock-agentcore.{REGION_NAME}.amazonaws.com/runtimes/{escaped_agent_arn}/invocations?qualifier=DEFAULT"

print(url)
# Set up headers
headers = {
    "Authorization": f"Bearer {auth_token}",
    "Content-Type": "application/json",
    "X-Amzn-Bedrock-AgentCore-Runtime-Session-Id": RUNTIME_SESSION_ID
}

# Enable verbose logging for requests
import logging
logging.basicConfig(level=logging.DEBUG)
logging.getLogger("urllib3.connectionpool").setLevel(logging.DEBUG)

invoke_response = requests.post(
    url,
    headers=headers,
    data=json.dumps({"prompt": "What is my company's name?", "company_information": {
    "_id": "68db18fe5d04ff1311963dea",
    "company_name": "EmberWise",
    "company_url": "https://emberwise.ai",
    "company_description": "EmberWise is a startup in pre-mvp stage, focused on creating a SaaS platform for AI-powered learning and helps autodidacts learn and acts as a 'mental gym'",
    "unique_value_proposition": "We focus on autodidacts and provide with them tools to perform spaced-repetition learning with novel training modes, powered by AI",
    "stage_of_company": "pre-mvp",
    "types_of_products": [
        {
            "product_name": "Emberwise.ai",
            "product_description": "EmberWise.ai is a SaaS platform for AI learning and helps autodidacts learn and acts as a 'mental gym'"
        }
    ],
    "pricing_model": "freemium",
    "number_of_employees": 2,
    "revenue": 0,
    "who_are_our_customers": "Autodidacts who want to learn and improve their skills"
}})
)

# Print response in a safe manner
# print(f"Status Code: {invoke_response.status_code}")
# print(f"Response Headers: {dict(invoke_response.headers)}")

# Handle response based on status code
if invoke_response.status_code == 200:
    response_data = invoke_response.json()
    print(response_data.get('result'))
    # print("Response JSON:")
    # res_data = response_data.get('result')
    # print(response_data)
    # print(json.dumps(response_data, indent=2))  
elif invoke_response.status_code >= 400:
    print(f"Error Response ({invoke_response.status_code}):")
    error_data = invoke_response.json()
    print(json.dumps(error_data, indent=2))
    
else:
    print(f"Unexpected status code: {invoke_response.status_code}")
    print("Response text:")
    print(invoke_response.text[:500])