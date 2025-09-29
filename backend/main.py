from typing import List
from dotenv import load_dotenv
load_dotenv()

from strands import Agent, tool
from strands.models import BedrockModel
from strands_tools.tavily import tavily_search

from bedrock_agentcore.runtime import BedrockAgentCoreApp

app = BedrockAgentCoreApp()
model = BedrockModel(model_id="amazon.nova-pro-v1:0")


# Prompt Templates
agent_system_prompt = """You are an expert market research analyst working for a company to help them analyze the market they operate in and analyze their competitors in order to strategize on the direction they should take.
You use the tools provided to you to perform your duties.

# Your Company Information
Company name: {{company_name}}
Types of products: {{types_of_products}}
"""

find_competitors_prompt = """# Your Task
- Produce a list of 10 of the most relevant competitors for your company whose types of products will be described below
- Categorize the companies into three different categories: Direct Competitors, Indirect Competitors, and Potential Competitors
- List the companies by Direct, then Indirect, then Potential

# Category Descriptions
- Direct Competitors: Companies that offer the same or similar products and services as your company.
- Indirect Competitors: Companies that offer different products and services but are related to your company's products and services. Also companies that offer similar products but target a different market or audience.
- Potential Competitors: Companies that are not currently in the market but could potentially enter the market. Companies that could potentially replace your company's products or services.

# Output Format
Company Name [Category] (Company URL): Description of company
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


bi_agent = Agent(model=model, system_prompt=agent_system_prompt, tools=[tavily_search, ask_user])


def prompt_model(input: str) -> str:
    response = bi_agent(prompt=input)
    return response

def search_for_competitors(input: str) -> List[str]:
    response = bi_agent(prompt=input)
    return response

# @app.endpoint("/search-for-competitors")
# def invoke(payload):
#     user_message = payload.get("prompt")
#     if(user_message):


if __name__ == "__main__":
    print(search_for_competitors(find_competitors_prompt))