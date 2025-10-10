
from pydantic import BaseModel, Field
from typing import Optional, Literal
from strands import Agent,tool
from strands.models import BedrockModel
from strands_tools.tavily import tavily_search, tavily_crawl, tavily_extract
from .prompts import system_prompt, search_for_overview_prompt, find_competitors_prompt, search_for_pricing_prompt
from logging import Logger

class CompetitorProduct(BaseModel):
    product_name: str = Field(description="The name of the product")
    product_url: str = Field(description="The URL of the product. With the 'https://' or 'http://'")
    product_description: str = Field(description="The description of the product")

class CompetitorOverview(BaseModel):
    company_headquarters_location: str = Field(description="The headquarters location of the competitor")
    number_of_employees: int = Field(description="The number of employees of the competitor")
    website_url: str = Field(description="The website URL of the competitor's home page. With the 'https://' or 'http://'")
    category: Literal["Direct Competitors", "Indirect Competitors", "Potential Competitors"] = Field(description="The category of the competitor in relation to the company you're doing research for")
    description: str = Field(description="The description of the competitor and what they do")
    products: list[CompetitorProduct] = Field(description="The competitor's products")
    founding_or_established_date: str = Field(description="The founding or established date of the competitor")
    mission_statement: str = Field(description="The mission statement of the competitor")
    vision_statement: str = Field(description="The vision statement of the competitor")
    company_culture_and_values: str = Field(description="The company culture and values of the competitor")
    additional_office_locations: list[str] = Field(description="The additional office locations of the competitor")
    notes: Optional[str] = Field(description="Notes about the competitor", default=None)
    sources: list[str] = Field(description="The sources of the data")

class CompetitorAnalysis(BaseModel):
    company_headquarters_location: str = Field(description="The headquarters location of the competitor")
    number_of_employees: int = Field(description="The number of employees of the competitor")
    website_url: str = Field(description="The website URL of the competitor's home page. With the 'https://' or 'http://'")
    category: Literal["Direct Competitors", "Indirect Competitors", "Potential Competitors"] = Field(description="The category of the competitor in relation to the company you're doing research for")
    description: str = Field(description="The description of the competitor and what they do")
    products: list[CompetitorProduct] = Field(description="The competitor's products")
    founding_or_established_date: str = Field(description="The founding or established date of the competitor")
    mission_statement: str = Field(description="The mission statement of the competitor")
    vision_statement: str = Field(description="The vision statement of the competitor")
    company_culture_and_values: str = Field(description="The company culture and values of the competitor")
    additional_office_locations: list[str] = Field(description="The additional office locations of the competitor")
    notes: Optional[str] = Field(description="Notes about the competitor", default=None)
    sources: list[str] = Field(description="The sources of the data")


class CompetitiveResearchAgent:
    def __init__(self, company_information: str, logger: Logger):
        self.company_information = company_information
        self.logger = logger

    @tool
    def find_competitors(self, num_competitors: int) -> str:
        f"""
        Find the specified number of the most relevant competitors for the company you're doing research for.
        Args:
            num_competitors: The number of competitors to find
        """
        try:
            agent_instance = Agent(
                model=BedrockModel(model_id="us.amazon.nova-pro-v1:0"),
                system_prompt=system_prompt.format(company_information=self.company_information),
                tools=[tavily_search, tavily_crawl, tavily_extract]
            )
            response = agent_instance(prompt=find_competitors_prompt.format(num_competitors=num_competitors))
            return response
        except Exception as e:
            self.logger.error(f"Error finding competitors: {str(e)}")
            return f"Error finding competitors: {str(e)}"

    @tool
    def get_detailed_competitor_overview(self, competitor_name: str, competitor_url: str) -> dict:
        f"""
        Get a detailed overview of a competitor's company and products.

        Use this tool when you need to get a detailed overview of a competitor's company.
        Args:
            competitor_name: The name of the company's competitor
            competitor_url: The URL of the company's competitor's product
        Returns:
            {CompetitorOverview.model_json_schema()['properties']}
        """
        try:
            agent_instance = Agent(
                model=BedrockModel(model_id="us.amazon.nova-premier-v1:0"),
                system_prompt=system_prompt.format(company_information=self.company_information),
                tools=[tavily_search, tavily_crawl, tavily_extract]
            )
            response = agent_instance.structured_output(CompetitorOverview, search_for_overview_prompt.format(competitor_name=competitor_name, competitor_url=competitor_url))
            return response.model_dump()
        except Exception as e:
            self.logger.error(f"Error getting competitors overview: {str(e)}")
            return f"Error getting competitors overview: {str(e)}"

    @tool
    def search_for_pricing(self, competitor_name: str, competitor_url: str) -> str:
        f"""
        Search for pricing information for a competitor.

        Use this tool when you need to get the pricing information for a competitor.
        Args:
            competitor_name: The name of the competitor
            competitor_url: The URL of the competitor's product
        """
        try:
            agent_instance = Agent(
                model=BedrockModel(model_id="us.amazon.nova-pro-v1:0"),
                system_prompt=system_prompt.format(company_information=self.company_information),
                tools=[tavily_search, tavily_crawl, tavily_extract]
            )
            response = agent_instance(prompt=search_for_pricing_prompt.format(competitor_name=competitor_name, competitor_url=competitor_url))
            return response
        except Exception as e:
            self.logger.error(f"Error searching for pricing: {str(e)}")
            return f"Error searching for pricing: {str(e)}"