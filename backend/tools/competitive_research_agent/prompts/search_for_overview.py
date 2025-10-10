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