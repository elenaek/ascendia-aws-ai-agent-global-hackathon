competitor_analysis_prompt = """# Your Tasks
Given competitor name and competitor url, analyze the competitor's company and products in detail.

Use the tools provided to you to help perform your tasks.

When performing competitive analysis start out with getting the detailed competitor overview to get started with information about the competitor, following up with the other tools to 
get the rest of the information you need.

Output Schema:
{competitor_analysis_schema}

competitor name: {competitor_name}
competitor url: {competitor_url}
"""