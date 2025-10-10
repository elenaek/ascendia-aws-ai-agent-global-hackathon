search_for_pricing_prompt = """# Your Tasks
1. Given competitor name and competitor url, go to the provided url and do the following: 
    1. Locate a pricing or plans page
    2. If found, extract:
        - All pricing tiers exactly as stated
        - Associated products or services per tier
        - Any units of measurement (for example, metered or usage-based pricing like per user, per seat, per GB, per API call)
    3. Do not estimate or calculate totals. Only report prices as displayed.
2. If no pricing page exists, search the web for the following:
    1. Do a web search using the competitor name and domain (for example, 'competitor name pricing' OR 'competitor name cost')
    2. Gather results that mention pricing from trusted sources (for example: G2, Capterra, Trustpilot, Nielsen, Forrester, Gartner, review blogs, comparison articles)
    3. Extract the following:
        - Reported price ranges or tiers
        - Corresponding products or services
        - Include this prefix before findings: 'While the company website doesn't list prices, online sources mention: "
    4. If no pricing is found anywhere, state clearly 'No pricing info found' 
    5. Cite each external source url used for pricing info
3. Identify any perks or discounts tied to purchase or signup on their official website (pricing, checkout, banners, blog/news, FAQs/Help, terms)
    1. Extract the discount amount or perk exactly as stated
        - State if the perk or discount is free, or requires additional info
    2. If no perks or discounts found, do a web search (for example, company + 'discount', 'promo', 'coupon', 'early access', 'seasonal', 'Black Friday', 'student', 'nonprofit', 'startup program')
    3. Include only credible sources: official website, press releases, help center, reputable reviews/comparisons such as G2, Gartner Peer Insights, TrustPilot
    4. Exclude coupon aggregators unless mirrored by an official source such as official website

competitor name: {competitor_name}
competitor url: {competitor_url}
"""