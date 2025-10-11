find_competitors_prompt = """# Your Tasks
1. Evaluate your company's website to identify the following:
    1. Products, features, and services being marketed
    2. Market positioning, which includes target industries, markets, and customer segments
2. Review your company's market positioning from two perspectives:
    1. New entrant scenario: How would your offering stand out if it launched today?
    2. Competitive maintenance scenario: How do you sustain or strengthen your position against current and emerging rivals?
3. Research and analyze the specified number of the most relevant competitors for your company
4. Filter for companies that meet all of the following criteria:
    1. Their official website is live, accessible, and not broken
    2. The domain is valid and currently active
    3. There is clear evidence of activity within the past 3 months (for example, updated pages, published content, job postings, or visible site interactions)
5. Present results in three categories: Direct Competitors, Indirect Competitors, and Potential Competitors

# Category Descriptions
1. Direct Competitor key traits: 
    - Offers the same product, feature, or service as your company
    - Addresses the same use case or customer need as your company
    - Targets the same market positioning as your company

2. Indirect Competitor key traits: 
    - Offers a similar product, feature, or service as your company, but with an alternative technology or approach
    - Addresses a closely related use case or customer need as your company
    - Targets the same or adjacent customer segment with a product, feature, or service that complements your company
    - Exclude companies with no overlap in product, feature, or service

3. Potential Competitor key traits: 
    - Emerging product, feature, or service related to your company
    - Gaining traction in marketed solution but not yet in direct competition to your company
    - Addresses adjacent customer segments with a solution that substitutes your company

# Requirements
- Ensure the competitor's website URL is valid and is actually the competitor's home page
- If the competitor's website URL can not be located do not include them in the results

number of competitors to find: {num_competitors}
"""