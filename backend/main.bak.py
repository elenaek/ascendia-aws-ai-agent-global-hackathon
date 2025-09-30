from typing import List, Literal
from pydantic import BaseModel, Field
from bson import ObjectId
from dotenv import load_dotenv
load_dotenv()

from strands import Agent, tool
from strands.models import BedrockModel
from strands_tools import think
from strands_tools.tavily import tavily_search
from shared.mongo import get_collection
from shared.collections import Collection
from reviews.core import get_competitors

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

# Structured Outputs
class Competitor(BaseModel):
    company_name: str = Field(description="The company name of the competitor")
    product_name: str = Field(description="The name of the competitor's product")
    product_url: str = Field(description="The URL of the competitor's product. Without the 'https://' or 'http://'")
    product_description: str = Field(description="The description of the competitor's product")
    category: Literal["Direct Competitors", "Indirect Competitors", "Potential Competitors"] = Field(description="The category of the competitor")
class Competitors(BaseModel):
    direct_competitors: List[Competitor] = Field(description="The list of direct competitors for the company")
    indirect_competitors: List[Competitor] = Field(description="The list of indirect competitors for the company")
    potential_competitors: List[Competitor] = Field(description="The list of potential competitors for the company")
class CompetitorsOutput(BaseModel):
    competitors: Competitors = Field(description="The competitors for the company")


# Prompt Templates
agent_system_prompt = """You are an expert market research analyst working for a company to help them analyze the market they operate in and analyze their competitors in order to strategize on the direction they should take.
You use the tools provided to you to perform your duties.

# Your Company Information
{company_information}
"""

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

@tool
def save_competitors_to_db(
    company_id: str,
    direct_competitors: List[dict],
    indirect_competitors: List[dict],
    potential_competitors: List[dict]
) -> bool:
    """
    Save the competitors to the database.

    Args:
        company_id: The MongoDB ID (_id) of the company (e.g., "68db18fe5d04ff1311963dea")
        direct_competitors: List of direct competitor dictionaries. Each dict should have:
            - company_name: str
            - product_name: str
            - product_url: str (without http/https)
            - product_description: str
            - category: "Direct Competitors"
        indirect_competitors: List of indirect competitor dictionaries with same structure
        potential_competitors: List of potential competitor dictionaries with same structure

    Example:
        save_competitors_to_db(
            company_id="68db18fe5d04ff1311963dea",
            direct_competitors=[
                {
                    "company_name": "Company name",
                    "product_name": "Company App name",
                    "product_url": "companyapp.com",
                    "product_description": "Company product description",
                    "category": "Direct Competitors"
                }
            ],
            indirect_competitors=[],
            potential_competitors=[]
        )

    Returns:
        bool: True if the competitors were saved successfully, False otherwise.
    """
    try:
        # Validate and clean the competitor data
        def validate_competitor(comp):
            return {
                "company_name": comp.get("company_name", ""),
                "product_name": comp.get("product_name", ""),
                "product_url": comp.get("product_url", "").replace("https://", "").replace("http://", ""),
                "product_description": comp.get("product_description", ""),
                "category": comp.get("category", "")
            }

        competitors_dict = {
            "direct_competitors": [validate_competitor(c) for c in direct_competitors],
            "indirect_competitors": [validate_competitor(c) for c in indirect_competitors],
            "potential_competitors": [validate_competitor(c) for c in potential_competitors]
        }

        result = get_collection(Collection.COMPANY).update_one(
            {"_id": ObjectId(company_id)},
            {"$set": {"competitors": competitors_dict}}
        )

        if result.modified_count > 0:
            print(f"Successfully saved {len(direct_competitors)} direct, {len(indirect_competitors)} indirect, and {len(potential_competitors)} potential competitors")
            return True
        else:
            print("No document was updated - check if company_id exists")
            return False

    except Exception as e:
        print(f"Error saving competitors to database: {e}")
        return False


bi_agent = Agent(model=model, system_prompt=agent_system_prompt.format(company_information=TEST_COMPANY), tools=[tavily_search, ask_user, save_competitors_to_db, think])


def prompt_model(input: str) -> str:
    response = bi_agent(prompt=input)
    return response

def search_for_competitors(input: str):
    response = bi_agent(prompt=input)
    return response

# @app.endpoint("/search-for-competitors")
# def invoke(payload):
#     user_message = payload.get("prompt")
#     if(user_message):
#         return search_for_competitors(user_message)


if __name__ == "__main__":
    # print(get_competitors(TEST_COMPANY["_id"]))
    print("Starting competitor search...")
    result = search_for_competitors(find_competitors_prompt)
    print(f"Result: {result}")