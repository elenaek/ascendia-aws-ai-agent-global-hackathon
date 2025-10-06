from dotenv import load_dotenv
import boto3
import jwt
import json
import os
from functools import lru_cache

load_dotenv()

from strands import Agent, tool
from strands.models import BedrockModel
from strands_tools import think
from strands_tools.tavily import tavily_search

from bedrock_agentcore.runtime import BedrockAgentCoreApp
from bedrock_agentcore.services.identity import IdentityClient
from bedrock_agentcore.identity.auth import requires_api_key

COGNITO_USER_POOL_ID="us-east-1_boVMbYh4u"
COGNITO_IDENTITY_POOL_ID="us-east-1:f4f3f1af-8c82-4ad5-93af-39a9e984277d"
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID = os.environ.get('AWS_ACCOUNT_ID', '738859113996')

app = BedrockAgentCoreApp()
model = BedrockModel(model_id="us.amazon.nova-pro-v1:0")



# @lru_cache(maxsize=1)
# def get_api_credentials():
#     """
#     Retrieve API credentials from AWS Secrets Manager and set environment variables.
#     Cached to avoid repeated AWS API calls.
#     """
#     try:
#         if os.environ.get('MODE', 'production') != 'local':
#             client = boto3.client('ssm', region_name=AWS_REGION)
#             parameter_name = f"/ascendia/agentcore/tavily-api-key-{AWS_ACCOUNT_ID}"

#             response = client.get_parameter(Name=parameter_name, WithDecryption=True)
#             tavily_api_key = response['Parameter']['Value']

#             secrets = {'tavily_api_key': tavily_api_key}

#             # Set the environment variable for strands_tools.tavily to use
#             if 'tavily_api_key' in secrets:
#                 os.environ['TAVILY_API_KEY'] = secrets['tavily_api_key']

#             return secrets
#         else:
#             # Local development - environment variables already set
#             return {
#                 'tavily_api_key': os.environ.get('TAVILY_API_KEY', '')
#             }
#     except Exception as e:
#         print(f"Error retrieving secrets: {e}")
#         # Fall back to environment variables
#         return {
#             'tavily_api_key': os.environ.get('TAVILY_API_KEY', '')
#         }

# Initialize API credentials on startup
# get_api_credentials()

# TEST_COMPANY = {
#     "_id": "68db18fe5d04ff1311963dea",
#     "company_name": "EmberWise",
#     "company_url": "https://emberwise.ai",
#     "company_description": "EmberWise is a startup in pre-mvp stage, focused on creating a SaaS platform for AI-powered learning and helps autodidacts learn and acts as a 'mental gym'",
#     "unique_value_proposition": "We focus on autodidacts and provide with them tools to perform spaced-repetition learning with novel training modes, powered by AI",
#     "stage_of_company": "pre-mvp",
#     "types_of_products": [
#         {
#             "product_name": "Emberwise.ai",
#             "product_description": "EmberWise.ai is a SaaS platform for AI learning and helps autodidacts learn and acts as a 'mental gym'"
#         }
#     ],
#     "pricing_model": "freemium",
#     "number_of_employees": 2,
#     "revenue": 0,
#     "who_are_our_customers": "Autodidacts who want to learn and improve their skills"
# }

find_competitors_prompt = """# Your Task
- Think about your company's information and products/services they offer and the market they operate in
- Research and find 10 of the most relevant competitors for your company
- Categorize them into: Direct Competitors, Indirect Competitors, and Potential Competitors
- Save them to the database using the save_competitors_to_db tool

# Category Descriptions
- Direct Competitors: Companies offering the same/similar products to the same target audience
- Indirect Competitors: Companies offering different but related products, or similar products to different audiences
- Potential Competitors: Companies that could potentially enter your market or replace your products

# IMPORTANT: Tool Usage Instructions
Use the save_competitors_to_db tool with this EXACT format:
- company_id: Use the _id from your company information (provided in your system prompt)
- direct_competitors: List of dictionaries with keys: company_name, product_name, product_url, product_description, category
- indirect_competitors: List of dictionaries with same structure
- potential_competitors: List of dictionaries with same structure

Example competitor dictionary:
{
    "company_name": "Anki",
    "product_name": "Anki App",
    "product_url": "ankiapp.com",
    "product_description": "Spaced repetition flashcard app for learning",
    "category": "Direct Competitors"
}

Remember to:
1. First search for competitors using tavily_search
2. Organize them into the three categories
3. Call save_competitors_to_db with the company _id from your system prompt and all three lists"""

# Prompt Templates
agent_system_prompt = """You are an expert market research analyst working for a company to help them analyze the market they operate in and analyze their competitors in order to strategize on the direction they should take.
You use the tools provided to you to perform your duties. Use markdown formatting to make your responses more readable. User the handoff_to_user tool when you need to ask the user for input.

# Your Company Information
{company_information}
"""


# Tools
@tool
def ask_user(prompt: str = "Please provide input") -> str:
    """
    Get input from the user. Use this tool when you need to collect additional
    information from the user to complete a task or answer a question.
    Args:
        prompt: The question or instruction to show to the user.
    Returns:
        str: The user's input response.
    """
    user_response = input(f"{prompt}: ")
    return user_response

# Agent will be created per-request with company-specific information
# agent = Agent(model=model, system_prompt=agent_system_prompt.format(company_information=TEST_COMPANY), tools=[tavily_search, ask_user, think])


def get_company_info(identity_id: str) -> dict:
    """
    Fetch company information from DynamoDB using the Cognito identity ID.
    Args:
        identity_id: The Cognito identity ID from the JWT token
    Returns:
        dict: Company information
    """
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('companies')
    response = table.get_item(Key={'company_id': identity_id})
    return response.get('Item')

def get_identity_id(idToken: str) -> str:
    cognito_identity_client = boto3.client('cognito-identity')
    response = cognito_identity_client.get_id(
        IdentityPoolId=COGNITO_IDENTITY_POOL_ID,
        Logins={
            f"cognito-idp.{AWS_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}": idToken
        }
    )
    return response['IdentityId']

@requires_api_key(provider_name="tavily_api_key")
def set_tavily_api_key(*, api_key: str):
    os.environ['TAVILY_API_KEY'] = api_key

@app.entrypoint
async def invoke(payload):
    """Process user input and return a streaming response"""
    company_info = payload.get("company_information")
    app.logger.info(f"Company Info: {company_info}")
    set_tavily_api_key(api_key=payload.get("tavily_api_key"))
    agent_instance = Agent(
        model=model,
        system_prompt=agent_system_prompt.format(company_information=company_info),
        tools=[tavily_search, think, ask_user]
    )

    user_message = payload.get("prompt", "Hello")

    # Use stream_async for streaming responses
    stream = agent_instance.stream_async(user_message)

    # Stream events back to the client
    # Track thinking state
    in_thinking = False

    async for event in stream:
        # Parse <thinking> tags and convert to proper event types
        if "data" in event and isinstance(event.get("data"), str):
            text = event["data"]

            # Check for thinking tags
            if "<thinking>" in text:
                in_thinking = True
                # Emit THINKING_START event
                yield {
                    "event": {
                        "contentBlockStart": {
                            "start": {"reasoningContent": {}},
                            "contentBlockIndex": 0
                        }
                    }
                }
                continue  # Skip the tag itself
            elif "</thinking>" in text:
                in_thinking = False
                # Emit THINKING_STOP event
                yield {
                    "event": {
                        "contentBlockStop": {
                            "contentBlockIndex": 0
                        }
                    }
                }
                continue  # Skip the tag itself
            elif in_thinking:
                # Emit THINKING_DELTA event with the thinking content
                yield {
                    "event": {
                        "contentBlockDelta": {
                            "delta": {"reasoningContent": {"text": text}},
                            "contentBlockIndex": 0
                        }
                    }
                }
                continue

        # Each event contains a chunk of the response
        yield event

if __name__ == "__main__":
    app.run()