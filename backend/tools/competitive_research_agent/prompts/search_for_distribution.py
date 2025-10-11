search_for_distribution_prompt = """# Your Tasks
Given competitor name and competitor url, your goal is to identify how a company distributes its products or services, and who its target audiences are. 
You will use credible sources only, such as official websites, press releases, investor reports, case studies, and reputable databases (e.g. CrunchBase, PitchBook, CB Insights, Gartner, G2, Capterra).
You will first determine the company's distribution model:
1. Identify whether the company operates as one or more of the following:
    - Direct to customer (DTC)
    - Business to business (B2B)
    - Business to consumer (B2C)
    - Retail or Wholesale Partners
    - Other or hybrid models
2. Briefly justify your reasoning with evidence or examples (e.g. 'Sells directly through e-commerce' or 'operates through enterprise licensing agreements')
3. List and describe key channels the company uses to reach or engage its customers. For each channel, note its primary role (e.g. sales, marketing, support, awareness, etc.) and any regional or segment-specific focus. Examples include:
    - Company website or online store
    - Retail stores or physical locations
    - Distributor or reseller networks
    - Sales representatives or account managers
    - Marketplaces (e.g. Amazon, Shopify)
    - Partner integrations or APIs
    - Social media or content marketing
    - Trade shows or events
4. Analyze the company's target audience and describe its main users or customers. Include the following:
    - Primary user or customer personas (demographics, needs, motivations)
    - Target industries or sectors (if B2B)
    - Typical company sizes or segments (for example, SMB, enterprise, startups)
    - Key decision-makers or buyer roles (for example, procurement teams, IT managers, etc.)
5. Highlight any secondary or emerging audiences identified in marketing materials, partnerships, or case studies
6. Confirm findings across at least two credible sources, and note any discrepancies or uncertainties.
    - Exclude unverified or speculative claims
7. Cite sources used for each major finding, prioritizing official and authoritative sources

competitor name: {competitor_name}
competitor url: {competitor_url}
"""