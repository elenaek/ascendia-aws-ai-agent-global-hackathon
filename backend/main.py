from dotenv import load_dotenv
import boto3
import os
from typing import Literal, Dict, Any
from datetime import datetime

load_dotenv()

from strands import Agent, tool
from strands.models import BedrockModel
from strands_tools import think
from strands_tools.tavily import tavily_search, tavily_crawl, tavily_extract

from bedrock_agentcore.runtime import BedrockAgentCoreApp
from bedrock_agentcore.identity.auth import requires_api_key

from websocket_helper import send_ui_update_to_identity
from memory_session import create_or_get_session
from tools.competitive_research_agent import CompetitiveResearchAgent

COGNITO_USER_POOL_ID=os.getenv("COGNITO_USER_POOL_ID")
COGNITO_IDENTITY_POOL_ID=os.getenv("COGNITO_IDENTITY_POOL_ID")
AWS_REGION=os.getenv("AWS_REGION")
AWS_ACCOUNT_ID = os.getenv("AWS_ACCOUNT_ID")

app = BedrockAgentCoreApp()
model = BedrockModel(model_id="us.amazon.nova-pro-v1:0")
# model = BedrockModel(model_id="openai.gpt-oss-120b-1:0")
# model = BedrockModel(model_id="us.amazon.nova-premier-v1:0")

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
- Always use the send_ui_update tool when presenting competitors or insights to the user:
  * For competitors: Display them in the interactive carousel so users can browse and save them to their database
  * For insights: Display strategic insights, market opportunities, or analysis findings in the insights carousel
  * Both carousels persist across page refreshes and can be minimized to the agent toolbar for easy access
- When presenting multiple related insights (e.g., from a SWOT analysis or market research), send them together as a group using the insights array format
- Highlight relevant panels (competitors-panel, insights-panel) before presenting new content to draw user attention
- Ensure the competitor's website URL is correct by visiting it and verifying it.
- When the user asks about competitor(s), you should use the competitor analysis tool to get comprehensive information about the competitor(s).

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
        "highlight_element",
        "show_graph"
    ],
    payload: Dict[str, Any]
) -> str:
    """
    Send real-time UI updates to the frontend dashboard during your analysis.
    Use this to create a dynamic, interactive experience for the user.

    Args:
        type: Type of UI update to send:
            - "show_competitor_context": Display competitor information using the CompetitorAnalysis schema
                Core fields:
                  - company_name (required), category, description, website_url
                  - company_headquarters_location, number_of_employees, founding_or_established_date
                  - mission_statement, vision_statement, company_culture_and_values
                  - additional_office_locations (list of strings)
                  - products (list of CompetitorProduct objects with detailed information)
                  - notes, sources (list of URLs)

                CompetitorProduct schema (nested within products array):
                  - product_name, product_url, product_description
                  - pricing (list): [{pricing, pricing_model}]
                  - distribution_channel: {distribution_model, distribution_model_justification, target_channels (list)}
                  - target_audience: {target_audience_description, target_sectors (list), typical_segment_size, key_decision_makers (list)}
                  - customer_sentiment: {key_themes (list), overall_sentiment, strengths (list), weaknesses (list)}

                Single competitor: {company_name, category?, ...other fields}
                Multiple competitors (carousel): {competitors: [{company_name, category?, ...}, ...]}
                Use one of the following categories: Direct Competitors, Indirect Competitors, Potential Competitors
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

            - "show_graph": Display interactive data visualizations in an interactive carousel
                Single graph: {title, graphType, data, options?, category?, description?}
                Multiple graphs (carousel): {graphs: [{title, graphType, data, options?, category?, description?}, ...]}

                Graph Types (graphType):
                  - "scatter": Scatter plot (ideal for perceptual maps, positioning analysis)
                  - "bar": Vertical bar chart (ideal for comparisons, rankings)
                  - "line": Line chart (ideal for trends over time)
                  - "radar": Radar/spider chart (ideal for multi-dimensional comparisons)
                  - "pie": Pie chart (ideal for market share, proportions)
                  - "doughnut": Doughnut chart (similar to pie, with center hole)
                  - "bubble": Bubble chart (3-dimensional scatter plot with size)

                Required Fields:
                  - title (str): Graph title displayed at the top
                  - graphType (str): One of the chart types listed above
                  - data (dict): Chart.js data structure with datasets
                    * For scatter/bubble: data = [{"x": value, "y": value, "label": "Point Name"}, ...]
                    * For bar/line/radar: labels (list) + datasets with data (list of numbers)
                    * For pie/doughnut: labels (list) + datasets with data (list of numbers)
                  - **options.scales.x.title.text (str)**: **REQUIRED** for scatter/bar/line/bubble/radar charts
                    X-axis label describing what the horizontal axis represents
                  - **options.scales.y.title.text (str)**: **REQUIRED** for scatter/bar/line/bubble/radar charts
                    Y-axis label describing what the vertical axis represents

                Optional Fields:
                  - description (str): Brief explanation of what the graph shows
                  - category (str): Category for filtering (e.g., "Competitive Analysis", "Market Analysis")
                  - options (dict): Chart.js options for customization
                    * scales: Configure x/y axes (title, min, max)
                    * plugins.legend: Configure legend (display, position)
                    * plugins.title: Configure title

                Data Structure Details:
                  - datasets (list): Array of dataset objects
                    * label (str): Dataset name for legend
                    * data (list): Data points (numbers or {x, y, label} objects)
                    * backgroundColor (str/list): Color(s) for data points
                    * borderColor (str/list): Border color(s)
                    * pointRadius (int/list): Size of points (for scatter/bubble)

                Best Practices:
                  - **ALWAYS include axis labels** (options.scales.x.title.text and y.title.text) for clarity
                  - Use scatter plots for competitive positioning (perceptual maps)
                    * Example axes: "Price (Low to High)" vs "Innovation (Low to High)"
                  - Use bar/line charts for feature comparisons or trends
                    * Example axes: "Feature Categories" vs "Performance Score (0-10)"
                  - Use pie/doughnut for market share analysis (no axes needed)
                  - Provide descriptive, specific axis labels that explain the scale
                  - Use consistent colors: "#00ff88" for user's company
                  - Include category for better organization in the Graphs panel
                  - Send multiple related graphs together in a carousel for comprehensive analysis
                  - Use different colors for each competitor

                Note: Graphs are displayed in a persistent carousel that can be minimized to the agent toolbar.
                      They are automatically shown in the Graphs panel as clickable summaries.
                      Use this for competitive analysis, market positioning, feature comparisons, and data-driven insights.

        payload: Dictionary containing the data for the UI update. Structure varies by type.

    Returns:
        Success or error message

    Examples:
        # Show single competitor being analyzed
        send_ui_update(
            type="show_competitor_context",
            payload={
                "company_name": "Duolingo",
                "category": "Direct Competitors",
                "description": "Language learning platform with gamification",
                "website_url": "https://www.duolingo.com",
                "company_headquarters_location": "Pittsburgh, Pennsylvania, United States",
                "number_of_employees": 700,
                "founding_or_established_date": "2011-11-18",
                "mission_statement": "To develop the best education in the world and make it universally available",
                "vision_statement": "A world where everyone has access to free, high-quality education",
                "company_culture_and_values": "Innovation, inclusivity, and continuous learning",
                "additional_office_locations": ["Berlin, Germany", "Beijing, China"],
                "products": [
                    {
                        "product_name": "Duolingo",
                        "product_url": "https://www.duolingo.com",
                        "product_description": "Free language learning platform with gamification features",
                        "pricing": [
                            {
                                "pricing": "Free tier with ads, Super Duolingo at $6.99/month",
                                "pricing_model": "Freemium subscription model with monthly and annual options"
                            }
                        ],
                        "distribution_channel": {
                            "distribution_model": "Direct to Customer",
                            "distribution_model_justification": "Direct distribution through mobile apps and web platform",
                            "target_channels": ["Company Website or Online Store", "Marketplaces", "Social Media or Content Marketing"]
                        },
                        "target_audience": {
                            "target_audience_description": "Language learners of all ages seeking accessible, gamified education",
                            "target_sectors": ["Education", "Consumer Learning", "K-12 Education"],
                            "typical_segment_size": "SMB",
                            "key_decision_makers": ["Individual consumers", "Parents", "Teachers"]
                        },
                        "customer_sentiment": {
                            "key_themes": ["Easy to use", "Gamification makes learning fun", "Limited conversation practice"],
                            "overall_sentiment": "Positive with some concerns about advanced learning",
                            "strengths": ["Engaging gamification", "Free access", "Mobile-first design"],
                            "weaknesses": ["Limited speaking practice", "Repetitive content", "Ads in free tier"]
                        }
                    },
                    {
                        "product_name": "Duolingo for Schools",
                        "product_url": "https://schools.duolingo.com",
                        "product_description": "Educational platform for teachers to track student progress",
                        "pricing": [
                            {
                                "pricing": "Free for teachers and schools",
                                "pricing_model": "Free B2B educational platform"
                            }
                        ],
                        "distribution_channel": {
                            "distribution_model": "Business to Business",
                            "distribution_model_justification": "Targets educational institutions directly",
                            "target_channels": ["Company Website or Online Store", "Sales Representatives or Account Managers"]
                        },
                        "target_audience": {
                            "target_audience_description": "K-12 teachers and educational institutions",
                            "target_sectors": ["Education", "K-12 Schools"],
                            "typical_segment_size": "SMB",
                            "key_decision_makers": ["Teachers", "School administrators", "District coordinators"]
                        },
                        "customer_sentiment": {
                            "key_themes": ["Great for classroom engagement", "Good progress tracking", "Limited curriculum customization"],
                            "overall_sentiment": "Positive among educators",
                            "strengths": ["Free for schools", "Easy student management", "Progress tracking"],
                            "weaknesses": ["Limited customization", "Requires student engagement outside class"]
                        }
                    }
                ],
                "notes": "Strong focus on gamification and mobile-first approach",
                "sources": [
                    "https://www.duolingo.com/about",
                    "https://investors.duolingo.com"
                ]
            }
        )

        # Show multiple competitors in an interactive carousel
        send_ui_update(
            type="show_competitor_context",
            payload={
                "competitors": [
                    {
                        "company_name": "Duolingo",
                        "category": "Direct Competitors",
                        "description": "Language learning platform with gamification",
                        "website_url": "https://www.duolingo.com",
                        "company_headquarters_location": "Pittsburgh, Pennsylvania, United States",
                        "number_of_employees": 700,
                        "founding_or_established_date": "2011-11-18",
                        "mission_statement": "To develop the best education in the world and make it universally available",
                        "vision_statement": "A world where everyone has access to free, high-quality education",
                        "company_culture_and_values": "Innovation, inclusivity, and continuous learning",
                        "additional_office_locations": ["Berlin, Germany", "Beijing, China"],
                        "products": [
                            {
                                "product_name": "Duolingo",
                                "product_url": "https://www.duolingo.com",
                                "product_description": "Free language learning platform with gamification features",
                                "pricing": [
                                    {
                                        "pricing": "Free tier with ads, Super Duolingo at $6.99/month",
                                        "pricing_model": "Freemium subscription model"
                                    }
                                ],
                                "distribution_channel": {
                                    "distribution_model": "Direct to Customer",
                                    "distribution_model_justification": "Direct distribution through mobile apps and web",
                                    "target_channels": ["Company Website or Online Store", "Marketplaces"]
                                },
                                "target_audience": {
                                    "target_audience_description": "Language learners of all ages",
                                    "target_sectors": ["Education", "Consumer Learning"],
                                    "typical_segment_size": "SMB",
                                    "key_decision_makers": ["Individual consumers", "Parents"]
                                },
                                "customer_sentiment": {
                                    "key_themes": ["Easy to use", "Gamification makes learning fun"],
                                    "overall_sentiment": "Positive",
                                    "strengths": ["Engaging gamification", "Free access"],
                                    "weaknesses": ["Limited speaking practice", "Ads in free tier"]
                                }
                            }
                        ],
                        "notes": "Strong focus on gamification and mobile-first approach",
                        "sources": [
                            "https://www.duolingo.com/about",
                            "https://investors.duolingo.com"
                        ]
                    },
                    {other_competitor...}
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

        # Show a perceptual map for competitive positioning
        send_ui_update(
            type="show_graph",
            payload={
                "title": "Competitive Positioning Map",
                "graphType": "scatter",
                "description": "Visual representation of your company's position vs competitors across key dimensions",
                "category": "Competitive Analysis",
                "data": {
                    "datasets": [
                        {
                            "label": "Your Company",
                            "data": [{"x": 7, "y": 8, "label": "Your Company"}],
                            "backgroundColor": "#00ff88",
                            "borderColor": "#00ff88",
                            "pointRadius": 12
                        },
                        {
                            "label": "Direct Competitors",
                            "data": [
                                {"x": 8, "y": 6, "label": "Competitor A"},
                                {"x": 6, "y": 7, "label": "Competitor B"},
                                {"x": 9, "y": 5, "label": "Competitor C"}
                            ],
                            "backgroundColor": "#ff6b6b",
                            "borderColor": "#ff6b6b",
                            "pointRadius": 8
                        },
                        {
                            "label": "Indirect Competitors",
                            "data": [
                                {"x": 5, "y": 5, "label": "Competitor D"},
                                {"x": 4, "y": 6, "label": "Competitor E"}
                            ],
                            "backgroundColor": "#ffd93d",
                            "borderColor": "#ffd93d",
                            "pointRadius": 6
                        }
                    ]
                },
                "options": {
                    "scales": {
                        "x": {
                            "title": {"display": True, "text": "Price (1=Low, 10=High)"},
                            "min": 0,
                            "max": 10
                        },
                        "y": {
                            "title": {"display": True, "text": "Innovation/Features (1=Low, 10=High)"},
                            "min": 0,
                            "max": 10
                        }
                    },
                    "plugins": {
                        "legend": {"display": True, "position": "top"}
                    }
                }
            }
        )

        # Show multiple graphs in a carousel
        send_ui_update(
            type="show_graph",
            payload={
                "graphs": [
                    {
                        "title": "Market Share Comparison",
                        "graphType": "pie",
                        "category": "Market Analysis",
                        "data": {
                            "labels": ["Your Company", "Competitor A", "Competitor B", "Others"],
                            "datasets": [{
                                "data": [15, 25, 20, 40],
                                "backgroundColor": ["#00ff88", "#ff6b6b", "#ffd93d", "#6b8cff"]
                            }]
                        }
                    },
                    {
                        "title": "Feature Comparison",
                        "graphType": "bar",
                        "category": "Product Analysis",
                        "data": {
                            "labels": ["AI Features", "Mobile App", "Integrations", "Analytics", "Support"],
                            "datasets": [
                                {
                                    "label": "Your Company",
                                    "data": [8, 9, 7, 6, 8],
                                    "backgroundColor": "#00ff88"
                                },
                                {
                                    "label": "Industry Average",
                                    "data": [6, 7, 8, 7, 6],
                                    "backgroundColor": "#6b8cff"
                                }
                            ]
                        }
                    }
                ]
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

        # app.logger.info(f"Memory session initialized | Source: {session_source} | Session ID: {session_id} | Actor: {_current_identity_id}")

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
        # app.logger.info(
        #     f"Memory retrieved | Session: {session_id} | "
        #     f"Recent turns: {recent_turns_count}/{max_recent_turns} | "
        #     f"Context size: {len(memory_context_text)} chars"
        # )

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

    competitive_research_agent = CompetitiveResearchAgent(company_information=company_info, logger=app.logger)

    agent_instance = Agent(
        model=model,
        system_prompt=agent_system_prompt.format(
            company_information=company_info,
            memory_context=memory_context_text
        ),
        tools=[
            send_ui_update, 
            competitive_research_agent.find_competitors,
            competitive_research_agent.competitor_analysis
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

    # app.logger.info(agent_system_prompt.format(
    #     company_information=company_info,
    #     memory_context=memory_context_text
    # ))

    # app.logger.info(f"Conversation history: {memory_context_text}")

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
                # app.logger.info(
                #     f"Conversation turn stored successfully | Session: {session_id} | "
                #     f"User message: {len(user_message)} chars | Assistant response: {len(full_assistant_response)} chars | "
                #     f"User preview: '{user_message[:50]}...'"
                # )
            else:
                app.logger.warning(f"Assistant response was empty, skipping memory storage | Session: {session_id}")

        except Exception as e:
            app.logger.error(f"Failed to store conversation in memory | Session: {session_id} | Error: {str(e)}")
            import traceback
            app.logger.error(f"Memory storage traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    app.run()