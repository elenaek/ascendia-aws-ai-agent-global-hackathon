from dotenv import load_dotenv
import boto3
import jwt
import json
import os
from functools import lru_cache
from typing import Literal, Dict, Any

load_dotenv()

from strands import Agent, tool
from strands.models import BedrockModel
from strands_tools import think
from strands_tools.tavily import tavily_search

from bedrock_agentcore.runtime import BedrockAgentCoreApp
from bedrock_agentcore.services.identity import IdentityClient
from bedrock_agentcore.identity.auth import requires_api_key

from websocket_helper import send_ui_update_to_identity

COGNITO_USER_POOL_ID=os.getenv("COGNITO_USER_POOL_ID")
COGNITO_IDENTITY_POOL_ID=os.getenv("COGNITO_IDENTITY_POOL_ID")
AWS_REGION=os.getenv("AWS_REGION")
AWS_ACCOUNT_ID = os.getenv("AWS_ACCOUNT_ID")

app = BedrockAgentCoreApp()
model = BedrockModel(model_id="us.amazon.nova-pro-v1:0")

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
You use the tools provided to you to perform your duties. If you need to ask the user for input, ask your question naturally in your response. The user will provide their answer in their next message, and you can continue the conversation from there.

# Important
- Use markdown formatting to make your responses more readable.
- Always use the send_ui_update tool when presenting competitors or insights to the user:
  * For competitors: Display them in the interactive carousel so users can browse and save them to their database
  * For insights: Display strategic insights, market opportunities, or analysis findings in the insights carousel
  * Both carousels persist across page refreshes and can be minimized to the agent toolbar for easy access
- When presenting multiple related insights (e.g., from a SWOT analysis or market research), send them together as a group using the insights array format
- Highlight relevant panels (competitors-panel, insights-panel) before presenting new content to draw user attention

# Your Company Information
{company_information}
"""




# Tools
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

# Global variable to store current user's identity_id for tool access
_current_identity_id = None

@tool
def send_ui_update(
    type: Literal[
        "show_competitor_context",
        "show_insight",
        "show_notification",
        "update_competitor_panel",
        "show_progress",
        "highlight_element"
    ],
    payload: Dict[str, Any]
) -> str:
    """
    Send real-time UI updates to the frontend dashboard during your analysis.
    Use this to create a dynamic, interactive experience for the user.

    Args:
        type: Type of UI update to send:
            - "show_competitor_context": Display competitor information
                Single competitor: {company_name, product_name, website?, description?, category?}
                Multiple competitors (carousel): {competitors: [{company_name, product_name, website?, description?, category?}, ...]}
                Note: When sending multiple competitors, they will be displayed in an interactive carousel
                      that allows users to browse and save competitors to their database.
                Use this whenever you are presenting competitors to the user.
            - "show_insight": Show insights in an interactive carousel (similar to competitors)
                Single insight: {title, content, severity?: "info"|"success"|"warning", category?}
                Multiple insights: {insights: [{title, content, severity?, category?}, ...]}
                Note: Insights are displayed in a persistent carousel that can be minimized to the agent toolbar.
                      They are automatically shown in the Insights panel as clickable summaries.
                Use this to share strategic insights, market opportunities, or analysis findings with the user.
            - "show_notification": Display a toast notification
                Required payload: {message, type: "info"|"success"|"warning"|"error"}
            - "show_progress": Show a progress indicator for long-running tasks
                Required payload: {message, percentage?: 0-100}
            - "highlight_element": Draw user attention to specific dashboard panels with a pulsing glow animation
                Required payload: {element_id, duration?: milliseconds (default: 4000)}

                Available element_ids:
                  - "chat-interface": Main chat conversation panel (left side, 2/3 width)
                  - "insights-panel": Key insights panel displaying AI-generated strategic insights
                  - "dynamic-ui-overlay": Floating overlay in bottom-right showing real-time cards and progress
                  - "competitor-carousel-minimized": Minimized floating competitor carousel button (when carousel is minimized)

                Animation behavior:
                  - Prismatic color-cycling glow (cyan → purple → pink → green, 2 cycles over 4 seconds)
                  - Automatically removes after specified duration
                  - Use to guide user attention during multi-step analysis

                Best practices:
                  - Highlight panels after updating their content
                  - Use when revealing new insights or competitor data
                  - Avoid excessive highlighting (max 1-2 per analysis flow)

        payload: Dictionary containing the data for the UI update. Structure varies by type.

    Returns:
        Success or error message

    Examples:
        # Show single competitor being analyzed
        send_ui_update(
            type="show_competitor_context",
            payload={
                "company_name": "Anki",
                "product_name": "Anki App",
                "website": "https://www.ankiapp.com",
                "description": "Spaced repetition flashcard app for learning",
                "category": "Direct Competitors"
            }
        )

        # Show multiple competitors in an interactive carousel
        send_ui_update(
            type="show_competitor_context",
            payload={
                "competitors": [
                    {
                        "company_name": "Anki",
                        "product_name": "Anki App",
                        "website": "https://www.ankiapp.com",
                        "description": "Spaced repetition flashcard app...",
                        "category": "Direct Competitors"
                    },
                    {
                        "company_name": "Quizlet",
                        "product_name": "Quizlet",
                        "website": "https://www.quizlet.com",
                        "description": "Study tools and flashcards...",
                        "category": "Direct Competitors"
                    }
                ]
            }
        )

        # Display a single insight
        send_ui_update(
            type="show_insight",
            payload={
                "title": "Market Gap Identified",
                "content": "Your competitors lack mobile-first features, presenting a significant opportunity for differentiation in the mobile learning space.",
                "severity": "success",
                "category": "Opportunity"
            }
        )

        # Display multiple insights in a carousel
        send_ui_update(
            type="show_insight",
            payload={
                "insights": [
                    {
                        "title": "Market Gap: Mobile-First Learning",
                        "content": "Analysis shows that 78% of your competitors do not have dedicated mobile apps. This represents a major opportunity to capture the mobile learning market.",
                        "severity": "success",
                        "category": "Market Opportunity"
                    },
                    {
                        "title": "Pricing Strategy Risk",
                        "content": "Your current pricing is 40% higher than the market average. Consider introducing a freemium tier to increase user acquisition.",
                        "severity": "warning",
                        "category": "Pricing"
                    },
                    {
                        "title": "Feature Parity Gap",
                        "content": "Competitors offer AI-powered study recommendations, which is absent in your current product. This feature is highly rated in user reviews.",
                        "severity": "info",
                        "category": "Product Development"
                    }
                ]
            }
        )

        # Show notification
        send_ui_update(
            type="show_notification",
            payload={
                "message": "Found 10 competitors in education technology",
                "type": "info"
            }
        )

        # Highlight a panel to draw attention
        send_ui_update(
            type="highlight_element",
            payload={
                "element_id": "competitors-panel",
                "duration": 3000  # 3 seconds
            }
        )
    """
    global _current_identity_id

    if not _current_identity_id:
        return "Error: No active user session for WebSocket updates"

    try:
        success = send_ui_update_to_identity(_current_identity_id, type, payload)

        if success:
            return f"UI update sent successfully: {type}"
        else:
            return f"Failed to send UI update (user may not have active WebSocket connection): {type}"

    except Exception as e:
        return f"Error sending UI update: {str(e)}"

@app.entrypoint
async def invoke(payload):
    """Process user input and return a streaming response"""
    global _current_identity_id

    company_info = payload.get("company_information")
    app.logger.info(f"Company Info: {company_info}")
    set_tavily_api_key(api_key=payload.get("tavily_api_key"))

    # Set identity_id for WebSocket updates (from company_info which contains _id/identity_id)
    if company_info and '_id' in company_info:
        _current_identity_id = company_info['_id']
        app.logger.info(f"Set identity_id for WebSocket updates: {_current_identity_id}")

    agent_instance = Agent(
        model=model,
        system_prompt=agent_system_prompt.format(company_information=company_info),
        tools=[tavily_search, think, send_ui_update]
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