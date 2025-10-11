
from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional, Literal
from strands import Agent, tool
from strands.models import BedrockModel
from strands_tools import think
from strands_tools.tavily import tavily_search, tavily_crawl, tavily_extract
from .prompts import (
    system_prompt, 
    search_for_overview_prompt, 
    find_competitors_prompt, 
    search_for_pricing_prompt,
    search_for_distribution_prompt,
    search_for_publicity_prompt,
    competitor_analysis_prompt,
)
from logging import Logger, getLogger, WARNING
tavily_logger = getLogger("strands_agents.tools.tavily")
tavily_logger.setLevel(WARNING)

class DistributionModelEnum(str, Enum):
    DIRECT_TO_CUSTOMER = "Direct to Customer"
    BUSINESS_TO_BUSINESS = "Business to Business"
    BUSINESS_TO_CONSUMER = "Business to Consumer"
    RETAIL_OR_WHOLESALE_PARTNERS = "Retail or Wholesale Partners"
    OTHER_OR_HYBRID_MODELS = "Other or Hybrid Models"

class TargetChannelEnum(str, Enum):
    COMPANY_WEBSITE_OR_ONLINE_STORE = "Company Website or Online Store"
    RETAIL_STORES_OR_PHYSICAL_LOCATIONS = "Retail Stores or Physical Locations"
    DISTRIBUTOR_OR_RESELLER_NETWORKS = "Distributor or Reseller Networks"
    SALES_REPRESENTATIVES_OR_ACCOUNT_MANAGERS = "Sales Representatives or Account Managers"
    MARKETPLACES = "Marketplaces"
    PARTNER_INTEGRATIONS_OR_APIS = "Partner Integrations or APIs"
    SOCIAL_MEDIA_OR_CONTENT_MARKETING = "Social Media or Content Marketing"
    TRADE_SHOWS_OR_EVENTS = "Trade Shows or Events"

class FindCompetitor(BaseModel):
    competitor_name: str = Field(description="The name of the competitor")
    competitor_url: str = Field(description="The URL of the competitor's verified home page. With the 'https://' or 'http://'")

class FindCompetitorsOutput(BaseModel):
    competitors: list[FindCompetitor] = Field(description="The competitors found")

class CompetitorProductCustomerSentiment(BaseModel):
    key_themes: list[str] = Field(description="The key themes of the competitor's product based on customer sentiment. e.g. 'Common praises', 'Complaints', 'Frequently mentioned features or issues'")
    overall_sentiment: str = Field(description="The overall sentiment of the competitor's product based on customer sentiment")
    strengths: list[str] = Field(description="The strengths of the competitor's product based on customer sentiment")
    weaknesses: list[str] = Field(description="The weaknesses of the competitor's product based on customer sentiment")

class TargetAudience(BaseModel):
    target_audience_description: str = Field(description="Description of the target audience of the competitor's product")
    target_sectors: list[str] = Field(description="The industry of the target industry or sectors of the competitor's product")
    typical_segment_size: Literal["SMB", "Enterprise", "Startups"] = Field(description="The typical segment size of the target audience of the competitor's product")
    key_decision_makers: list[str] = Field(description="The key decision-makers of the target audience of the competitor's product. e.g. 'Procurement teams', 'IT managers', 'etc.'")

class CompetitorPricing(BaseModel):
    pricing: str = Field(description="The pricing of the competitor's product")
    pricing_model: str = Field(description="Description of the pricing model of the competitor's product")

class DistributionChannel(BaseModel):
    distribution_model: Literal[*[e.value for e in DistributionModelEnum]] = Field(description="The distribution model of the competitor's product")
    distribution_model_justification: str = Field(description="The justification for the distribution model of the competitor's product")
    target_channels: list[Literal[*[e.value for e in TargetChannelEnum]]] = Field(description="The target channels of the competitor's product")

class CompetitorProduct(BaseModel):
    product_name: str = Field(description="The name of the product")
    product_url: str = Field(description="The URL of the product. With the 'https://' or 'http://'")
    product_description: str = Field(description="The description of the product")
    pricing: list[CompetitorPricing] = Field(description="The pricing of the competitor's product")
    distribution_channel: DistributionChannel = Field(description="The distribution channel of the competitor's product")
    target_audience: TargetAudience = Field(description="The target audience of the competitor's product")
    customer_sentiment: CompetitorProductCustomerSentiment = Field(description="The customer sentiment of the competitor's product")

class CompetitorOverview(BaseModel):
    competitor_mission_statement: str = Field(description="The mission statement of the competitor")
    competitor_vision_statement: str = Field(description="The vision statement of the competitor")
    competitor_company_culture_and_values: str = Field(description="The company culture and values of the competitor")
    competitor_additional_office_locations: list[str] = Field(description="The additional office locations of the competitor")
    competitor_notes: Optional[str] = Field(description="Notes about the competitor", default=None)
    competitor_sources: list[str] = Field(description="The sources of the data")

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
    def find_competitors(self, num_competitors: int) -> FindCompetitorsOutput:
        f"""
        Find the specified number of the most relevant competitors for the company you're doing research for.
        Args:
            num_competitors: The number of competitors to find
        """
        try:
            agent_instance = Agent(
                model=BedrockModel(model_id="us.amazon.nova-pro-v1:0", max_tokens=10000),
                system_prompt=system_prompt.format(company_information=self.company_information),
                tools=[tavily_search, tavily_crawl, tavily_extract]
            )
            response = agent_instance.structured_output(FindCompetitorsOutput, find_competitors_prompt.format(num_competitors=num_competitors))
            return response
        except Exception as e:
            self.logger.error(f"Error finding competitors: {str(e)}")
            return f"Error finding competitors: {str(e)}"

    @tool
    def get_detailed_competitor_overview(self, competitor_name: str, competitor_url: str) -> CompetitorOverview:
        f"""
        Get a detailed overview of a competitor's company and products relevant to the company you're doing research for.

        Use this tool when you need to get a detailed overview of a competitor's company.
        Args:
            competitor_name: The name of the company's competitor
            competitor_url: The URL of the company's competitor's product
        """
        try:
            agent_instance = Agent(
                model=BedrockModel(model_id="us.amazon.nova-premier-v1:0"),
                system_prompt=system_prompt.format(company_information=self.company_information),
                tools=[tavily_search, tavily_crawl, tavily_extract]
            )
            response = agent_instance.structured_output(CompetitorOverview, search_for_overview_prompt.format(competitor_name=competitor_name, competitor_url=competitor_url))
            return response
        except Exception as e:
            self.logger.error(f"Error getting competitors overview: {str(e)}")
            return f"Error getting competitors overview: {str(e)}"

    @tool
    def search_for_pricing(self, competitor_product_name: str, competitor_product_url: str) -> str:
        f"""
        Search for pricing information for a competitor's product.

        Use this tool when you need to get the pricing information for a competitor's product.
        Args:
            competitor_product_name: The name of the competitor's product
            competitor_product_url: The URL of the competitor's product
        """
        try:
            agent_instance = Agent(
                model=BedrockModel(model_id="us.amazon.nova-pro-v1:0", max_tokens=10000),
                system_prompt=system_prompt.format(company_information=self.company_information),
                tools=[tavily_search, tavily_crawl, tavily_extract]
            )
            response = agent_instance(prompt=search_for_pricing_prompt.format(competitor_product_name=competitor_product_name, competitor_product_url=competitor_product_url))
            return response
        except Exception as e:
            self.logger.error(f"Error searching for pricing: {str(e)}")
            return f"Error searching for pricing: {str(e)}"

    @tool
    def search_for_distribution(self, competitor_product_name: str, competitor_product_url: str) -> str:
        f"""
        Search for distribution information for a competitor's product.
        Args:
            competitor_product_name: The name of the competitor's product
            competitor_product_url: The URL of the competitor's product
        """
        try:
            agent_instance = Agent(
                model=BedrockModel(model_id="us.amazon.nova-pro-v1:0", max_tokens=10000),
                system_prompt=system_prompt.format(company_information=self.company_information),
                tools=[tavily_search, tavily_crawl, tavily_extract]
            )
            response = agent_instance(prompt=search_for_distribution_prompt.format(competitor_product_name=competitor_product_name, competitor_product_url=competitor_product_url))
            return response
        except Exception as e:
            self.logger.error(f"Error searching for distribution: {str(e)}")
            return f"Error searching for distribution: {str(e)}"

    @tool
    def search_for_publicity(self, competitor_product_name: str, competitor_product_url: str) -> str:
        f"""
        Search for publicity information for a competitor's product.
        Args:
            competitor_product_name: The name of the competitor's product
            competitor_product_url: The URL of the competitor's product
        """
        try:
            agent_instance = Agent(
                model=BedrockModel(model_id="us.amazon.nova-pro-v1:0", max_tokens=10000),
                system_prompt=system_prompt.format(company_information=self.company_information),
                tools=[tavily_search, tavily_crawl, tavily_extract]
            )
            response = agent_instance(prompt=search_for_publicity_prompt.format(competitor_product_name=competitor_product_name, competitor_product_url=competitor_product_url))
            return response
        except Exception as e:
            self.logger.error(f"Error searching for publicity: {str(e)}")
            return f"Error searching for publicity: {str(e)}"

    @tool
    def competitor_analysis(self, competitor_name: str, competitor_url: str) -> CompetitorAnalysis:
        f"""
        Analyze a competitor's company and products in detail.
        Args:
            competitor_name: The name of the competitor
            competitor_url: The URL of the competitor's product
        """
        try:
            agent_instance = Agent(
                model=BedrockModel(model_id="us.amazon.nova-pro-v1:0", max_tokens=10000),
                system_prompt=system_prompt.format(company_information=self.company_information),
                tools=[
                    think,
                    tavily_search, 
                    tavily_crawl, 
                    tavily_extract, 
                    self.get_detailed_competitor_overview, 
                    self.search_for_pricing, 
                    self.search_for_distribution, 
                    self.search_for_publicity
                ]
            )
            response = agent_instance.structured_output(CompetitorAnalysis, competitor_analysis_prompt.format(competitor_analysis_schema=CompetitorAnalysis.model_json_schema(), competitor_name=competitor_name, competitor_url=competitor_url))
            self.logger.info(f"Competitor analysis COMPLETED----------------------------------------------: {response}")
            return response
        except Exception as e:
            self.logger.error(f"Error analyzing competitor: {str(e)}")
            return f"Error analyzing competitor: {str(e)}"