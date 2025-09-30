from typing import List, Literal
from pydantic import BaseModel, Field
from bson import ObjectId
from dotenv import load_dotenv
load_dotenv()

from strands import Agent, tool
from strands.models import BedrockModel
from strands_tools import think
from strands_tools.tavily import tavily_search

from bedrock_agentcore.runtime import BedrockAgentCoreApp

app = BedrockAgentCoreApp()
model = BedrockModel(model_id="amazon.nova-pro-v1:0")

TEST_COMPANY = {
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
}

# Prompt Templates
agent_system_prompt = """You are an expert market research analyst working for a company to help them analyze the market they operate in and analyze their competitors in order to strategize on the direction they should take.
You use the tools provided to you to perform your duties.

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

agent = Agent(model=model, system_prompt=agent_system_prompt.format(company_information=TEST_COMPANY), tools=[tavily_search, ask_user, think])

@app.entrypoint
def invoke(payload):
    "Process user input and return a response"""
    user_message = payload.get("prompt", "Hello")
    response = agent(prompt=user_message)
    return {"result": response}

if __name__ == "__main__":
    app.run()