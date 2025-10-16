from dotenv import load_dotenv
import boto3
import os
from datetime import datetime
import logging

load_dotenv()

from strands import Agent
from strands.models import BedrockModel
from strands_tools import think
from strands_tools.tavily import tavily_search

from bedrock_agentcore.runtime import BedrockAgentCoreApp
from bedrock_agentcore.identity.auth import requires_api_key

from memory.session import create_or_get_session
from tools.competitive_research import CompetitiveResearch
from tools.ui_updates import UIUpdates

COGNITO_USER_POOL_ID=os.getenv("COGNITO_USER_POOL_ID")
COGNITO_IDENTITY_POOL_ID=os.getenv("COGNITO_IDENTITY_POOL_ID")
AWS_REGION=os.getenv("AWS_REGION")
AWS_ACCOUNT_ID = os.getenv("AWS_ACCOUNT_ID")

tavily_logger = logging.getLogger("strands_agents.tools.tavily")
tavily_logger.setLevel(logging.WARNING)

app = BedrockAgentCoreApp()

# Initialize Bedrock model with error handling
try:
    model = BedrockModel(model_id="us.amazon.nova-pro-v1:0", max_tokens=10000)
    # model = BedrockModel(model_id="openai.gpt-oss-120b-1:0")
    # model = BedrockModel(model_id="us.amazon.nova-premier-v1:0")
except Exception as e:
    error_message = (
        f"Failed to initialize Bedrock model: {str(e)}\n\n"
        "This usually means:\n"
        "1. The model doesn't have access enabled in your AWS account\n"
        "2. Your AWS credentials don't have Bedrock permissions\n\n"
        "To enable model access:\n"
        f"  • Run: python scripts/check-bedrock-models.py --region {AWS_REGION}\n"
        f"  • Or visit: https://console.aws.amazon.com/bedrock/home?region={AWS_REGION}#/modelaccess\n\n"
        "Required models: Amazon Nova Pro (us.amazon.nova-pro-v1:0)\n"
        "See DEPLOYMENT.md for detailed instructions."
    )
    app.logger.error(error_message)
    raise RuntimeError(error_message) from e

# Prompt Templates
new_agent_system_prompt = """
You work as a consultant for a full-service market intelligence firm that performs quantitative and qualitative market research, benchmarking, consumer behavior analysis, and competitive analysis. 
For each company you work with, you analyze their products, features, and services. 
You review the company's market positioning and target customer segment in order to search for competitors.
You use the tools provided to you to perform your tasks.

# Your Company Information
{company_information}
"""


agent_system_prompt = """You are an expert market research analyst working for a company to help them analyze the market they operate in and analyze their competitors in order to strategize on the direction they should take.
You use the tools provided to you to perform your duties. If you need to ask the user for input, ask your question naturally in your response. The user will provide their answer in their next message, and you can continue the conversation from there.

# Important
- Use markdown formatting to make your responses more readable.
- Always use the UI tools when presenting information to the user:
  * For competitors: Use show_competitor to display them in an interactive carousel so users can browse and save them
  * For insights: Use show_insight to display strategic insights, market opportunities, or analysis findings
  * For data visualizations: Use the appropriate graph tools (show_scatter_graph, show_bar_graph, show_line_graph, show_radar_graph, show_pie_graph, show_doughnut_graph, show_bubble_graph)
  * For notifications: Use show_notification for status updates and confirmations
  * For progress: Use show_progress during long-running operations
  * To draw attention: Use highlight_element to guide user focus to relevant panels
- When presenting multiple related insights (e.g., from a SWOT analysis or market research), send them together as a group using the insights parameter
- Carousels persist across page refreshes and can be minimized to the agent toolbar for easy access
- Ensure the competitor's website URL is correct by visiting it and verifying it
- When the user asks about competitor(s), you should use the competitor_analysis tool to get comprehensive information about the competitor(s)

# User's Company Information
{company_information}

{memory_context}
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

@requires_api_key(provider_name=os.getenv("TAVILY_API_KEY_PROVIDER_NAME", "tavily_api_key"))
def set_tavily_api_key(*, api_key: str):
    os.environ['TAVILY_API_KEY'] = api_key

# Global variable to store current user's identity_id for tool access
_current_identity_id = None

@app.entrypoint
async def invoke(payload):
    """Process user input and return a streaming response"""
    global _current_identity_id

    company_info = payload.get("company_information")
    # app.logger.info(f"Company Info: {company_info}")
    set_tavily_api_key(api_key=payload.get("tavily_api_key"))

    # Set identity_id for WebSocket updates (from company_info which contains _id/identity_id)
    if company_info and '_id' in company_info:
        _current_identity_id = company_info['_id']
        # app.logger.info(f"Set identity_id for WebSocket updates: {_current_identity_id}")


    # Create or get memory session for this user
    memory_session = None
    memory_context_text = "No previous conversation history available."

    try:
        # Generate session_id if not provided (use date-based for daily sessions)
        session_id = payload.get("session_id")
        session_source = "payload" if session_id else "auto-generated"

        if not session_id:
            # Create session per day for continuity within same day
            today = datetime.utcnow().strftime("%Y-%m-%d")
            # Sanitize identity_id: replace colons with hyphens (session_id regex: [a-zA-Z0-9][a-zA-Z0-9-_]*)
            sanitized_identity = _current_identity_id.replace(":", "-")
            session_id = f"{sanitized_identity}_{today}"

        # Create/get memory session
        memory_session = create_or_get_session(
            actor_id=_current_identity_id,
            session_id=session_id
        )

        # Retrieve memory context (smart retrieval with limited turns)
        max_recent_turns = int(os.getenv("MAX_RECENT_TURNS", "10"))
        memory_summary = memory_session.get_memory_summary(recent_turns_k=max_recent_turns)
        memory_context_text = memory_session.format_memory_for_prompt(recent_turns_k=max_recent_turns)

        recent_turns_count = len(memory_summary.get("recent_context", []))

        if recent_turns_count > 0:
            # Log a preview of recent memory
            recent_preview = memory_summary["recent_context"][-1] if memory_summary["recent_context"] else None
            if recent_preview:
                app.logger.debug(
                    f"Most recent memory turn | Role: {recent_preview.get('role')} | "
                    f"Content preview: {recent_preview.get('content', '')[:100]}..."
                )

    except Exception as e:
        app.logger.error(f"Memory initialization failed (continuing without memory): {str(e)}")
        memory_context_text = "Memory service temporarily unavailable."

    competitive_research_tools = CompetitiveResearch(company_information=company_info, logger=app.logger)
    ui_tools = UIUpdates(identity_id=_current_identity_id, logger=app.logger)

    agent_instance = Agent(
        model=model,
        system_prompt=agent_system_prompt.format(
            company_information=company_info,
            memory_context=memory_context_text
        ),
        tools=[
            think,
            tavily_search,
            ui_tools.show_competitors,
            ui_tools.show_insight,
            ui_tools.show_scatter_graph,
            ui_tools.show_bar_graph,
            ui_tools.show_line_graph,
            ui_tools.show_radar_graph,
            ui_tools.show_pie_graph,
            ui_tools.show_doughnut_graph,
            ui_tools.show_bubble_graph,
            ui_tools.show_notification,
            ui_tools.show_progress,
            ui_tools.highlight_element,
            competitive_research_tools.find_competitors,
            competitive_research_tools.competitor_analysis
        ]
    )

    user_message = payload.get("prompt", "Hello")

    # Use stream_async for streaming responses
    stream = agent_instance.stream_async(user_message)

    # Stream events back to the client
    # Track thinking state and collect full assistant response
    in_thinking = False
    assistant_response_parts = []  # Collect full response for memory storage

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

            # Collect assistant response text (outside thinking blocks)
            if not in_thinking:
                assistant_response_parts.append(text)

        # Each event contains a chunk of the response
        yield event

    # Store the conversation turn in memory
    if memory_session:
        try:
            full_assistant_response = "".join(assistant_response_parts)

            # Only store if we have meaningful content
            if full_assistant_response.strip():
                memory_session.add_conversation_turn(
                    user_message=user_message,
                    assistant_message=full_assistant_response
                )
            else:
                app.logger.warning(f"Assistant response was empty, skipping memory storage | Session: {session_id}")

        except Exception as e:
            app.logger.error(f"Failed to store conversation in memory | Session: {session_id} | Error: {str(e)}")
            import traceback
            app.logger.error(f"Memory storage traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    app.run()