search_for_publicity_prompt = """# Your Tasks
Given competitor name and competitor url, collect verified info on customer sentiment and recent company news. 
Use credible, dated sources only - official websites, press releases, investor blogs, reputable media, or major review platforms.
Ignore unrelated companies that share industry terms or similar keywords.

To identify customer sentiment:
1. Gather reviews, ratings, and feedback from trusted sites such as G2, Capterra, Trustpilot, Gartner Peer Insights, Reddit, App Store, Google Play, Amazon.
    - Identify key themes - common praises, complaints, and frequently mentioned features or issues.
    - Summarize overall sentiment (positive, negative, mixed). Include sample quotes or phrases.
    - Provide average rating, platform name, and retrieval date. 
    - Exclude unverified or anonymous sources.

Locate recent news only if the source explicitly references competitor name or competitor url:
1. Identify company updates within the past 12 months, including:
    - Funding events: round type, investors, amount, date.
    - Acquisitions or mergers: parties involved, purpose, date. 
    - Product, feature, or service launches.
    - Partnerships or official press releases.
2. For each item, include event type, brief summary, event date, and source URL.
    - Pioritize official announcements and reputable outlets (TechCrunch, Crunchbase News, Reuters, etc.)

Lastly, you will perform the following:
    1. Cross-check key details across at least two credible sources.
    2. Record any inconsistencies in 'Notes'.
    3. Cite each source including source name, url, and publication date (YYYY-MM-DD).
    4. Avoid speculation or aggregated 'industry overview' content. 

competitor name: {competitor_name}
competitor url: {competitor_url}
"""