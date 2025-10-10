from pydantic import BaseModel, Field
from typing import Optional, Literal

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


search_for_overview_system_prompt = """
You are an expert competitor researcher analyzing a company's competitor and its products and services.
Source Priority & Rules:
    1. Primary: official company website, newsroom/press releases, Linkedin company page
    2. Secondary: Crunchbase, PitchBook, CB Insights, Capterra, G2, Gartner, Forrester, Trustpilot, Nielsen
    3. If multiple entities share a name, disambiguate using the domain, industry, and HQ before collecting data
    4. If a field is missing or conflicting, mark it null and explain it in notes
    5. Do not invent mission/vision. 
    6. Prefer the most recent authoritative source. When sources disagree, prefer the official site/press release; otherwise note the conflict
    7. Respect paywalls; do not use unverified blogs or wikis.
    8. Always cite sources.

Use the tools provided to you to help perform your tasks.

Company You're doing research for's Information:
{company_information}
"""

search_for_overview_prompt = """# Your Tasks
Given competitor name and competitor url, return a verified overview

Use the following process when collecting data
Process:
    1. Search primary sources first, capturing exact quotes for mission/vision/values (short excerpts only)
    2. Cross-check with at least one secondary source or a general web search for each quantitive field (HQ, headcount, founded date)
    3. For each field, include sources as a list of urls with the page title and access date (UTC)
    4. Normalize dates to ISO-8601 (YYYY-MM-DD). Normalize locations as City, Region/State, Country.
    5. If Linkedin shows a headcount range, record the range and the "as_of" date; if an exact number exists on a press release or About page, include it and note the discrepancy in notes.

competitor name: {competitor_name}
competitor url: {competitor_url}
"""

def get_search_for_overview_prompt(competitor_name: str, competitor_url: str) -> str:
    return search_for_overview_prompt.format(competitor_name=competitor_name, competitor_url=competitor_url)
