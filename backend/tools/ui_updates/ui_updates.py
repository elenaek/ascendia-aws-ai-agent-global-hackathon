"""
UI Updates tools for sending real-time updates to the frontend dashboard.
"""
import logging
from typing import Dict, Any, Optional
from strands import tool
from websocket_helper import send_ui_update_to_identity
from .schemas.types import NotificationType, SeverityType, ElementIdType


class UIUpdates:
    def __init__(self, identity_id: str, logger: logging.Logger):
        """
        Initialize UI Updates tool collection.

        Args:
            identity_id: User's Cognito identity ID for WebSocket communication
            logger: Logger instance for error tracking
        """
        self.identity_id = identity_id
        self.logger = logger

    def _send_update(self, message_type: str, payload: Dict[str, Any]) -> str:
        """
        Internal helper to send WebSocket updates to the frontend.

        Args:
            message_type: Type of message to send
            payload: Message payload

        Returns:
            Success or error message
        """
        if not self.identity_id:
            return "Error: No active user session for WebSocket updates"

        try:
            success = send_ui_update_to_identity(self.identity_id, message_type, payload)

            if success:
                return f"UI update sent successfully: {message_type}"
            else:
                return f"Failed to send UI update (user may not have active WebSocket connection): {message_type}"

        except Exception as e:
            return f"Error sending UI update: {str(e)}"

    @tool
    def show_competitors(
        self,
        competitors: list[dict]
    ) -> str:
        """
        Display competitor information in an interactive carousel on the frontend dashboard.

        Use this tool to present competitor analysis results to the user. The carousel allows
        users to browse competitors and save them to their database. Competitors persist across
        page refreshes and can be minimized to the agent toolbar.

        This tool ALWAYS takes a list of competitors. To display a single competitor, pass a
        list with one element: `show_competitors(competitors=[{...}])`.

        Args:
            competitors: List of competitor dicts to display. Each competitor dict must contain
                        all required fields (all fields except 'notes' are required).

        Required Fields per Competitor:
            - company_name (str): Name of the competitor company
            - category (str): Competitor category - MUST be one of:
                * "Direct Competitors"
                * "Indirect Competitors"
                * "Potential Competitors"
            - description (str): Brief description of what the competitor does
            - website_url (str): URL to competitor's homepage (must include https://)
            - company_headquarters_location (str): Location of headquarters (e.g., "San Francisco, California, USA")
            - number_of_employees (int): Number of employees
            - founding_or_established_date (str): Date founded (YYYY-MM-DD format or year)
            - mission_statement (str): Company's mission statement
            - vision_statement (str): Company's vision statement
            - company_culture_and_values (str): Description of company culture and values
            - additional_office_locations (list[str]): List of other office locations
            - products (list[dict]): List of product dicts following CompetitorProduct schema (see below)
            - sources (list[str]): List of source URLs used for research

        Optional Fields per Competitor:
            - notes (str): Additional notes about the competitor (this is the ONLY optional field)

        CompetitorProduct Schema (for products list):
            Each product dict should contain:
            - product_name (str): Name of the product
            - product_url (str): URL to the product
            - product_description (str): Description of the product
            - pricing (list[dict]): List of pricing dicts with 'pricing' and 'pricing_model' keys
            - distribution_channel (dict): Dict with 'distribution_model', 'distribution_model_justification', 'target_channels'
            - target_audience (dict): Dict with 'target_audience_description', 'target_sectors', 'typical_segment_size', 'key_decision_makers'
            - customer_sentiment (dict): Dict with 'key_themes', 'overall_sentiment', 'strengths', 'weaknesses'

        Returns:
            Success or error message

        Example (Single Competitor):
            show_competitors(
                competitors=[
                    {
                        "company_name": "Duolingo",
                        "category": "Direct Competitors",
                        "description": "Language learning platform with gamification features",
                        "website_url": "https://www.duolingo.com",
                        "company_headquarters_location": "Pittsburgh, Pennsylvania, United States",
                        "number_of_employees": 700,
                        "founding_or_established_date": "2011-11-18",
                        "mission_statement": "To develop the best education in the world and make it universally available",
                        "vision_statement": "A world where everyone has access to free, high-quality education",
                        "company_culture_and_values": "Innovation, inclusivity, and continuous learning",
                        "additional_office_locations": ["Berlin, Germany", "Beijing, China"],
                        "products": [
                            {
                                "product_name": "Duolingo",
                                "product_url": "https://www.duolingo.com",
                                "product_description": "Free language learning platform with gamification",
                                "pricing": [{"pricing": "Free with ads, Super Duolingo at $6.99/month", "pricing_model": "Freemium subscription"}],
                                "distribution_channel": {
                                    "distribution_model": "Direct to Customer",
                                    "distribution_model_justification": "Direct through mobile apps and web",
                                    "target_channels": ["Company Website or Online Store", "Marketplaces"]
                                },
                                "target_audience": {
                                    "target_audience_description": "Language learners of all ages",
                                    "target_sectors": ["Education", "Consumer Learning"],
                                    "typical_segment_size": "SMB",
                                    "key_decision_makers": ["Individual consumers", "Parents"]
                                },
                                "customer_sentiment": {
                                    "key_themes": ["Easy to use", "Gamification makes learning fun"],
                                    "overall_sentiment": "Positive",
                                    "strengths": ["Engaging gamification", "Free access"],
                                    "weaknesses": ["Limited speaking practice", "Ads in free tier"]
                                }
                            }
                        ],
                        "sources": ["https://www.duolingo.com/about", "https://investors.duolingo.com"],
                        "notes": "Strong focus on gamification and mobile-first approach"
                    }
                ]
            )

        Example (Multiple Competitors):
            show_competitors(
                competitors=[
                    {
                        "company_name": "Duolingo",
                        "category": "Direct Competitors",
                        "description": "Language learning platform with gamification",
                        "website_url": "https://www.duolingo.com",
                        "company_headquarters_location": "Pittsburgh, Pennsylvania, United States",
                        "number_of_employees": 700,
                        "founding_or_established_date": "2011-11-18",
                        "mission_statement": "To develop the best education in the world",
                        "vision_statement": "A world where everyone has access to free education",
                        "company_culture_and_values": "Innovation, inclusivity, and continuous learning",
                        "additional_office_locations": ["Berlin, Germany", "Beijing, China"],
                        "products": [...],
                        "sources": ["https://www.duolingo.com/about"]
                    },
                    {
                        "company_name": "Rosetta Stone",
                        "category": "Direct Competitors",
                        "description": "Premium language learning software",
                        "website_url": "https://www.rosettastone.com",
                        "company_headquarters_location": "Arlington, Virginia, United States",
                        "number_of_employees": 1200,
                        "founding_or_established_date": "1992",
                        "mission_statement": "To empower learners worldwide",
                        "vision_statement": "Language learning for everyone",
                        "company_culture_and_values": "Excellence in education and innovation",
                        "additional_office_locations": ["London, UK", "Tokyo, Japan"],
                        "products": [...],
                        "sources": ["https://www.rosettastone.com/about"],
                        "notes": "Established player with premium positioning"
                    }
                ]
            )

        Use Cases:
            - Present results from competitor_analysis tool
            - Display detailed competitive intelligence after research
            - Show comparison of multiple competitors side-by-side
            - Present findings from find_competitors tool

        Important Notes:
            - ALL fields are required except 'notes'
            - Always pass a list, even for a single competitor
            - The agent will receive an error if required fields are missing
            - Use proper category values: "Direct Competitors", "Indirect Competitors", or "Potential Competitors"
        """
        payload = {"competitors": competitors}
        return self._send_update("show_competitor_context", payload)

    @tool
    def show_insight(
        self,
        title: Optional[str] = None,
        content: Optional[str] = None,
        severity: Optional[SeverityType] = None,
        category: Optional[str] = None,
        insights: Optional[list[dict]] = None
    ) -> str:
        """
        Display strategic insights in an interactive carousel on the frontend dashboard.

        Use this tool to share strategic insights, market opportunities, analysis findings, or
        recommendations with the user. Insights are displayed in a persistent carousel that can
        be minimized to the agent toolbar and are shown as clickable summaries in the Insights panel.

        You can display either:
        - A single insight (using title, content, severity, category parameters)
        - Multiple insights (using the insights parameter with a list of insight dicts)

        When presenting related insights (e.g., from SWOT analysis, market research), send them
        together as a group for better organization.

        Args:
            title: Insight title (required for single insight, e.g., "Market Gap Identified")
            content: Detailed insight content explaining the finding and implications
            severity: Visual indicator of importance/type:
                - "info": General information or findings
                - "success": Opportunities, strengths, positive findings
                - "warning": Risks, threats, concerns requiring attention
            category: Category for organizing insights (e.g., "Market Opportunity", "Competitive Threat", "Product Gap")
            insights: List of insight dicts for displaying multiple insights (each with title, content, severity, category)

        Returns:
            Success or error message

        Example (Single Insight):
            show_insight(
                title="Market Gap: Mobile-First Learning",
                content="Analysis shows that 78% of your competitors do not have dedicated mobile apps. This represents a major opportunity to capture the mobile learning market segment, particularly among younger demographics who prefer mobile-native experiences.",
                severity="success",
                category="Market Opportunity"
            )

        Example (Multiple Insights from SWOT Analysis):
            show_insight(
                insights=[
                    {
                        "title": "Strength: Advanced AI Features",
                        "content": "Your AI-powered personalization is 2-3 years ahead of competitors, providing a significant competitive advantage in user engagement and retention.",
                        "severity": "success",
                        "category": "SWOT - Strengths"
                    },
                    {
                        "title": "Weakness: Limited Market Presence",
                        "content": "Brand awareness is significantly lower than top 3 competitors. Only 15% market recognition compared to 60%+ for market leaders.",
                        "severity": "warning",
                        "category": "SWOT - Weaknesses"
                    },
                    {
                        "title": "Opportunity: Enterprise Market Expansion",
                        "content": "The B2B education technology market is growing at 18% CAGR. Your competitors have minimal enterprise offerings, creating a clear expansion opportunity.",
                        "severity": "success",
                        "category": "SWOT - Opportunities"
                    },
                    {
                        "title": "Threat: Pricing Pressure",
                        "content": "New entrants are offering similar features at 40% lower price points, potentially eroding your market share in price-sensitive segments.",
                        "severity": "warning",
                        "category": "SWOT - Threats"
                    }
                ]
            )

        Use Cases:
            - SWOT analysis results
            - Market opportunity identification
            - Competitive threats and risks
            - Strategic recommendations
            - Product gap analysis
            - Pricing strategy insights
            - Market positioning findings
        """
        if insights:
            # Multiple insights in carousel
            payload = {"insights": insights}
        else:
            # Single insight
            payload = {}
            if title:
                payload["title"] = title
            if content:
                payload["content"] = content
            if severity:
                payload["severity"] = severity
            if category:
                payload["category"] = category

        return self._send_update("show_insight", payload)

    @tool
    def show_scatter_graph(
        self,
        title: str,
        x_axis_label: str,
        y_axis_label: str,
        data_points: list[dict],
        description: Optional[str] = None,
        category: Optional[str] = None,
        x_min: int = 0,
        x_max: int = 10,
        y_min: int = 0,
        y_max: int = 10
    ) -> str:
        """
        Display an interactive scatter plot for competitive positioning and perceptual maps.

        Scatter plots are ideal for showing relationships between two variables and positioning
        competitors across two dimensions (e.g., price vs quality, innovation vs market share).
        They are the standard tool for perceptual mapping in competitive analysis.

        Args:
            title: Graph title displayed at the top (e.g., "Competitive Positioning Map")
            x_axis_label: Label for horizontal axis (e.g., "Price: Low to High" or "Price Level (1=Low, 10=High)")
            y_axis_label: Label for vertical axis (e.g., "Innovation Score (1=Low, 10=High)")
            data_points: List of points to plot. Each point dict should contain:
                - x (float): X-coordinate value
                - y (float): Y-coordinate value
                - label (str): Point label (usually company name)
                - group (str, optional): Group name for legend (e.g., "Direct Competitors", "Your Company")
                - color (str, optional): Hex color code (e.g., "#00ff88" for your company, "#ff6b6b" for competitors)
            description: Brief explanation of what the graph shows and key insights
            category: Category for filtering (e.g., "Competitive Analysis", "Market Analysis", "Product Positioning")
            x_min: Minimum value for X axis (default: 0)
            x_max: Maximum value for X axis (default: 10)
            y_min: Minimum value for Y axis (default: 0)
            y_max: Maximum value for Y axis (default: 10)

        Returns:
            Success or error message

        Example:
            show_scatter_graph(
                title="Competitive Positioning: Price vs Innovation",
                x_axis_label="Price Level (1=Low, 10=High)",
                y_axis_label="Innovation Score (1=Low, 10=High)",
                description="Shows how competitors position themselves on pricing and innovation. Your company leads in innovation but at a premium price point.",
                category="Competitive Analysis",
                data_points=[
                    {"x": 7, "y": 8, "label": "Your Company", "group": "Your Company", "color": "#00ff88"},
                    {"x": 8, "y": 6, "label": "Competitor A", "group": "Direct Competitors", "color": "#ff6b6b"},
                    {"x": 6, "y": 7, "label": "Competitor B", "group": "Direct Competitors", "color": "#ff6b6b"},
                    {"x": 9, "y": 5, "label": "Competitor C", "group": "Direct Competitors", "color": "#ff6b6b"},
                    {"x": 5, "y": 5, "label": "Competitor D", "group": "Indirect Competitors", "color": "#ffd93d"},
                    {"x": 4, "y": 6, "label": "Competitor E", "group": "Indirect Competitors", "color": "#ffd93d"}
                ],
                x_min=0,
                x_max=10,
                y_min=0,
                y_max=10
            )

        Use Cases:
            - Competitive positioning maps (price vs quality, features vs price)
            - Perceptual mapping for brand positioning
            - Market segment analysis (size vs growth rate)
            - Product portfolio positioning
            - Strategic group mapping
            - Value proposition comparison

        Best Practices:
            - Use "#00ff88" (green) for your company to make it stand out
            - Use other colors for other groups and competitors
            - Include descriptive axis labels with scale explanation
            - Keep scales consistent (often 0-10 or 1-10)
        """
        # Group data points by group for datasets
        groups = {}
        for point in data_points:
            group_name = point.get("group", "Data Points")
            if group_name not in groups:
                groups[group_name] = {
                    "label": group_name,
                    "data": [],
                    "backgroundColor": point.get("color", "#6b8cff"),
                    "borderColor": point.get("color", "#6b8cff"),
                    "pointRadius": 12 if "Your Company" in group_name else 8
                }
            groups[group_name]["data"].append({
                "x": point["x"],
                "y": point["y"],
                "label": point["label"]
            })

        payload = {
            "title": title,
            "graphType": "scatter",
            "data": {
                "datasets": list(groups.values())
            },
            "options": {
                "scales": {
                    "x": {
                        "title": {"display": True, "text": x_axis_label},
                        "min": x_min,
                        "max": x_max
                    },
                    "y": {
                        "title": {"display": True, "text": y_axis_label},
                        "min": y_min,
                        "max": y_max
                    }
                },
                "plugins": {
                    "legend": {"display": True, "position": "top"}
                }
            }
        }

        if description:
            payload["description"] = description
        if category:
            payload["category"] = category

        return self._send_update("show_graph", payload)

    @tool
    def show_bar_graph(
        self,
        title: str,
        x_axis_label: str,
        y_axis_label: str,
        categories: list[str],
        datasets: list[dict],
        description: Optional[str] = None,
        category: Optional[str] = None,
        horizontal: bool = False
    ) -> str:
        """
        Display an interactive bar chart for comparisons and rankings.

        Bar charts are ideal for comparing values across categories, showing rankings,
        feature comparisons, and displaying discrete data. They make it easy to see
        relative differences between competitors or product features.

        Args:
            title: Graph title displayed at the top (e.g., "Feature Comparison")
            x_axis_label: Label for horizontal axis (e.g., "Feature Categories" or "Companies")
            y_axis_label: Label for vertical axis (e.g., "Score (0-10)" or "Number of Features")
            categories: List of category labels for the X-axis (e.g., ["AI Features", "Mobile App", "Integrations"])
            datasets: List of dataset dicts for comparison. Each dataset dict should contain:
                - label (str): Dataset name for legend (e.g., "Your Company", "Industry Average")
                - data (list[float]): Values for each category (must match length of categories)
                - backgroundColor (str, optional): Color for bars (e.g., "#00ff88")
            description: Brief explanation of what the graph shows and key insights
            category: Category for filtering (e.g., "Product Analysis", "Feature Comparison")
            horizontal: If True, creates horizontal bar chart (useful for long category names)

        Returns:
            Success or error message

        Example:
            show_bar_graph(
                title="Feature Comparison: Your Product vs Industry Average",
                x_axis_label="Feature Categories",
                y_axis_label="Capability Score (0-10)",
                description="Your product excels in AI and mobile but lags in integrations and analytics compared to industry standards.",
                category="Product Analysis",
                categories=["AI Features", "Mobile App", "Integrations", "Analytics", "Customer Support"],
                datasets=[
                    {
                        "label": "Your Company",
                        "data": [8, 9, 7, 6, 8],
                        "backgroundColor": "#00ff88"
                    },
                    {
                        "label": "Industry Average",
                        "data": [6, 7, 8, 7, 6],
                        "backgroundColor": "#6b8cff"
                    }
                ]
            )

        Use Cases:
            - Feature comparison across products
            - Market share comparison
            - Performance benchmarking
            - Capability assessment
            - Rating comparisons
            - Revenue or growth comparisons
            - Customer satisfaction scores

        Best Practices:
            - Use "#00ff88" (green) for your company
            - Use "#6b8cff" (blue) for industry averages or benchmarks
            - Use different colors for each competitor
            - Keep category names concise (use horizontal=True for long names)
            - Use consistent scales (0-10 or 0-100)
            - Include clear axis labels with units
        """
        payload = {
            "title": title,
            "graphType": "horizontalBar" if horizontal else "bar",
            "data": {
                "labels": categories,
                "datasets": datasets
            },
            "options": {
                "scales": {
                    "x": {
                        "title": {"display": True, "text": x_axis_label}
                    },
                    "y": {
                        "title": {"display": True, "text": y_axis_label}
                    }
                },
                "plugins": {
                    "legend": {"display": True, "position": "top"}
                }
            }
        }

        if description:
            payload["description"] = description
        if category:
            payload["category"] = category

        return self._send_update("show_graph", payload)

    @tool
    def show_line_graph(
        self,
        title: str,
        x_axis_label: str,
        y_axis_label: str,
        time_periods: list[str],
        datasets: list[dict],
        description: Optional[str] = None,
        category: Optional[str] = None
    ) -> str:
        """
        Display an interactive line chart for trends over time.

        Line charts are ideal for showing trends, growth patterns, and changes over time.
        They help visualize how metrics evolve and compare trajectories across competitors.

        Args:
            title: Graph title displayed at the top (e.g., "Market Share Trends 2020-2024")
            x_axis_label: Label for horizontal axis (typically time periods, e.g., "Year" or "Quarter")
            y_axis_label: Label for vertical axis (e.g., "Market Share (%)" or "Revenue ($M)")
            time_periods: List of time period labels for X-axis (e.g., ["2020", "2021", "2022", "2023", "2024"])
            datasets: List of dataset dicts for comparison. Each dataset dict should contain:
                - label (str): Dataset name for legend (e.g., "Your Company", "Competitor A")
                - data (list[float]): Values for each time period (must match length of time_periods)
                - borderColor (str, optional): Line color (e.g., "#00ff88")
                - backgroundColor (str, optional): Fill color for area under line
                - fill (bool, optional): Whether to fill area under line (default: False)
            description: Brief explanation of what the graph shows and key insights
            category: Category for filtering (e.g., "Market Trends", "Growth Analysis")

        Returns:
            Success or error message

        Example:
            show_line_graph(
                title="Market Share Trends: 2020-2024",
                x_axis_label="Year",
                y_axis_label="Market Share (%)",
                description="Your company's market share has grown steadily from 5% to 12% over 5 years, while Competitor A has declined from 30% to 22%.",
                category="Market Trends",
                time_periods=["2020", "2021", "2022", "2023", "2024"],
                datasets=[
                    {
                        "label": "Your Company",
                        "data": [5, 7, 9, 11, 12],
                        "borderColor": "#00ff88",
                        "backgroundColor": "rgba(0, 255, 136, 0.1)",
                        "fill": True
                    },
                    {
                        "label": "Competitor A",
                        "data": [30, 28, 26, 24, 22],
                        "borderColor": "#ff6b6b",
                        "fill": False
                    },
                    {
                        "label": "Competitor B",
                        "data": [20, 21, 22, 23, 24],
                        "borderColor": "#ffd93d",
                        "fill": False
                    }
                ]
            )

        Use Cases:
            - Market share trends over time
            - Revenue or growth trajectories
            - Customer acquisition trends
            - Product adoption curves
            - Feature release timeline impact
            - Pricing changes over time
            - User engagement trends

        Best Practices:
            - Use "#00ff88" (green) for your company
            - Use different colors for each competitor
            - Consider using fill=True for your company to emphasize
            - Use consistent time intervals (monthly, quarterly, yearly)
            - Include clear axis labels with units
            - Add description to highlight key trends
        """
        payload = {
            "title": title,
            "graphType": "line",
            "data": {
                "labels": time_periods,
                "datasets": datasets
            },
            "options": {
                "scales": {
                    "x": {
                        "title": {"display": True, "text": x_axis_label}
                    },
                    "y": {
                        "title": {"display": True, "text": y_axis_label}
                    }
                },
                "plugins": {
                    "legend": {"display": True, "position": "top"}
                }
            }
        }

        if description:
            payload["description"] = description
        if category:
            payload["category"] = category

        return self._send_update("show_graph", payload)

    @tool
    def show_radar_graph(
        self,
        title: str,
        dimensions: list[str],
        datasets: list[dict],
        description: Optional[str] = None,
        category: Optional[str] = None,
        max_value: int = 10
    ) -> str:
        """
        Display an interactive radar/spider chart for multi-dimensional comparisons.

        Radar charts are ideal for comparing multiple variables simultaneously across
        competitors. They provide a holistic view of strengths and weaknesses across
        different dimensions, making them perfect for capability assessments.

        Args:
            title: Graph title displayed at the top (e.g., "Product Capability Assessment")
            dimensions: List of dimension labels (e.g., ["Features", "Price", "Support", "UX", "Performance"])
                       Typically 3-8 dimensions work best
            datasets: List of dataset dicts for comparison. Each dataset dict should contain:
                - label (str): Dataset name for legend (e.g., "Your Company", "Competitor A")
                - data (list[float]): Values for each dimension (must match length of dimensions)
                - backgroundColor (str, optional): Fill color with transparency (e.g., "rgba(0, 255, 136, 0.2)")
                - borderColor (str, optional): Border color (e.g., "#00ff88")
            description: Brief explanation of what the graph shows and key insights
            category: Category for filtering (e.g., "Competitive Analysis", "Product Comparison")
            max_value: Maximum value for the scale (default: 10)

        Returns:
            Success or error message

        Example:
            show_radar_graph(
                title="Product Capability Comparison",
                description="Your product excels in features and UX but trails in pricing competitiveness and market presence.",
                category="Competitive Analysis",
                dimensions=["Features", "Pricing", "Customer Support", "User Experience", "Performance", "Market Presence"],
                max_value=10,
                datasets=[
                    {
                        "label": "Your Company",
                        "data": [9, 5, 8, 9, 8, 4],
                        "backgroundColor": "rgba(0, 255, 136, 0.2)",
                        "borderColor": "#00ff88"
                    },
                    {
                        "label": "Competitor A",
                        "data": [7, 8, 7, 6, 7, 9],
                        "backgroundColor": "rgba(255, 107, 107, 0.2)",
                        "borderColor": "#ff6b6b"
                    },
                    {
                        "label": "Competitor B",
                        "data": [6, 9, 5, 7, 6, 7],
                        "backgroundColor": "rgba(255, 217, 61, 0.2)",
                        "borderColor": "#ffd93d"
                    }
                ]
            )

        Use Cases:
            - Multi-dimensional product comparisons
            - Capability assessments across features
            - Strength/weakness analysis
            - Brand attribute comparison
            - Performance benchmarking across metrics
            - Strategic factor analysis
            - Competitive profile analysis

        Best Practices:
            - Use 3-8 dimensions (too many make it hard to read)
            - Use rgba() colors with transparency (0.2 alpha) for fill
            - Use solid colors for borders
            - Keep dimension names concise
            - Use consistent scales (typically 0-10)
            - Ensure all datasets use same scale
        """
        payload = {
            "title": title,
            "graphType": "radar",
            "data": {
                "labels": dimensions,
                "datasets": datasets
            },
            "options": {
                "scales": {
                    "r": {
                        "min": 0,
                        "max": max_value,
                        "beginAtZero": True
                    }
                },
                "plugins": {
                    "legend": {"display": True, "position": "top"}
                }
            }
        }

        if description:
            payload["description"] = description
        if category:
            payload["category"] = category

        return self._send_update("show_graph", payload)

    @tool
    def show_pie_graph(
        self,
        title: str,
        labels: list[str],
        values: list[float],
        colors: Optional[list[str]] = None,
        description: Optional[str] = None,
        category: Optional[str] = None
    ) -> str:
        """
        Display an interactive pie chart for market share and proportional data.

        Pie charts are ideal for showing how a whole is divided into parts, typically
        used for market share analysis, distribution breakdowns, and percentage comparisons.

        Args:
            title: Graph title displayed at the top (e.g., "Market Share Distribution 2024")
            labels: List of segment labels (e.g., ["Your Company", "Competitor A", "Competitor B", "Others"])
            values: List of values for each segment (can be percentages or absolute numbers)
            colors: Optional list of hex colors for each segment (e.g., ["#00ff88", "#ff6b6b", "#ffd93d"])
                   If not provided, defaults to standard color palette
            description: Brief explanation of what the graph shows and key insights
            category: Category for filtering (e.g., "Market Analysis", "Market Share")

        Returns:
            Success or error message

        Example:
            show_pie_graph(
                title="Education Technology Market Share 2024",
                description="The market is fragmented with no clear leader. Your company holds 15% share, ranking third behind Competitor A (25%) and Competitor B (20%).",
                category="Market Analysis",
                labels=["Your Company", "Competitor A", "Competitor B", "Competitor C", "Others"],
                values=[15, 25, 20, 10, 30],
                colors=["#00ff88", "#ff6b6b", "#ffd93d", "#6b8cff", "#cccccc"]
            )

        Use Cases:
            - Market share distribution
            - Revenue breakdown by product/segment
            - Customer segment distribution
            - Feature usage distribution
            - Budget allocation
            - Channel distribution
            - Geographic market breakdown

        Best Practices:
            - Use "#00ff88" (green) for your company
            - Use contrasting colors for clarity
            - Limit to 5-7 segments (combine small segments into "Others")
            - Order segments by size (largest to smallest)
            - Include percentages in description
            - Consider doughnut chart for modern look (see show_doughnut_graph)
        """
        if colors is None:
            # Default color palette
            colors = ["#00ff88", "#ff6b6b", "#ffd93d", "#6b8cff", "#a855f7", "#ec4899", "#cccccc"]

        payload = {
            "title": title,
            "graphType": "pie",
            "data": {
                "labels": labels,
                "datasets": [{
                    "data": values,
                    "backgroundColor": colors[:len(values)]
                }]
            },
            "options": {
                "plugins": {
                    "legend": {"display": True, "position": "right"}
                }
            }
        }

        if description:
            payload["description"] = description
        if category:
            payload["category"] = category

        return self._send_update("show_graph", payload)

    @tool
    def show_doughnut_graph(
        self,
        title: str,
        labels: list[str],
        values: list[float],
        colors: Optional[list[str]] = None,
        description: Optional[str] = None,
        category: Optional[str] = None
    ) -> str:
        """
        Display an interactive doughnut chart for market share and proportional data.

        Doughnut charts are similar to pie charts but with a hollow center, providing a
        more modern aesthetic. They're ideal for market share analysis, distribution breakdowns,
        and percentage comparisons, with the center space available for highlighting totals.

        Args:
            title: Graph title displayed at the top (e.g., "Revenue Distribution by Product Line")
            labels: List of segment labels (e.g., ["Product A", "Product B", "Product C", "Others"])
            values: List of values for each segment (can be percentages or absolute numbers)
            colors: Optional list of hex colors for each segment (e.g., ["#00ff88", "#ff6b6b", "#ffd93d"])
                   If not provided, defaults to standard color palette
            description: Brief explanation of what the graph shows and key insights
            category: Category for filtering (e.g., "Revenue Analysis", "Product Analysis")

        Returns:
            Success or error message

        Example:
            show_doughnut_graph(
                title="Revenue Distribution by Product Line (2024)",
                description="Core product generates 60% of revenue ($12M), while new AI features contribute 25% ($5M). Mobile app and other products make up the remaining 15%.",
                category="Revenue Analysis",
                labels=["Core Product", "AI Features", "Mobile App", "Other Products"],
                values=[60, 25, 10, 5],
                colors=["#00ff88", "#6b8cff", "#ffd93d", "#cccccc"]
            )

        Use Cases:
            - Revenue breakdown by product/segment
            - Market share distribution
            - Customer segment distribution
            - Feature usage distribution
            - Budget allocation
            - Channel distribution
            - Geographic market breakdown
            - Time allocation analysis

        Best Practices:
            - Use for 3-7 segments (combine small segments into "Others")
            - Order segments by size (largest to smallest)
            - Use contrasting colors for better visibility
            - Include actual values or percentages in description
            - Consider using center space to show total (handled by frontend)
            - Prefer over pie charts for modern, professional look
        """
        if colors is None:
            # Default color palette
            colors = ["#00ff88", "#ff6b6b", "#ffd93d", "#6b8cff", "#a855f7", "#ec4899", "#cccccc"]

        payload = {
            "title": title,
            "graphType": "doughnut",
            "data": {
                "labels": labels,
                "datasets": [{
                    "data": values,
                    "backgroundColor": colors[:len(values)]
                }]
            },
            "options": {
                "plugins": {
                    "legend": {"display": True, "position": "right"}
                }
            }
        }

        if description:
            payload["description"] = description
        if category:
            payload["category"] = category

        return self._send_update("show_graph", payload)

    @tool
    def show_bubble_graph(
        self,
        title: str,
        x_axis_label: str,
        y_axis_label: str,
        data_points: list[dict],
        description: Optional[str] = None,
        category: Optional[str] = None,
        x_min: int = 0,
        x_max: int = 10,
        y_min: int = 0,
        y_max: int = 10
    ) -> str:
        """
        Display an interactive bubble chart for 3-dimensional data visualization.

        Bubble charts extend scatter plots by adding a third dimension (size) to represent
        an additional variable. They're ideal for showing relationships between three variables
        simultaneously, such as market share (size) vs price (x) vs quality (y).

        Args:
            title: Graph title displayed at the top (e.g., "Competitive Landscape: Size, Price, Quality")
            x_axis_label: Label for horizontal axis (e.g., "Price Level (1=Low, 10=High)")
            y_axis_label: Label for vertical axis (e.g., "Product Quality (1=Low, 10=High)")
            data_points: List of points to plot. Each point dict should contain:
                - x (float): X-coordinate value
                - y (float): Y-coordinate value
                - r (float): Bubble radius/size (represents third dimension, e.g., market share)
                - label (str): Point label (usually company name)
                - group (str, optional): Group name for legend (e.g., "Direct Competitors")
                - color (str, optional): Hex color code (e.g., "#00ff88")
            description: Brief explanation of what the graph shows and key insights (explain what size represents)
            category: Category for filtering (e.g., "Market Analysis", "Competitive Positioning")
            x_min: Minimum value for X axis (default: 0)
            x_max: Maximum value for X axis (default: 10)
            y_min: Minimum value for Y axis (default: 0)
            y_max: Maximum value for Y axis (default: 10)

        Returns:
            Success or error message

        Example:
            show_bubble_graph(
                title="Competitive Landscape: Price, Quality, and Market Share",
                x_axis_label="Price Level (1=Low, 10=High)",
                y_axis_label="Product Quality Rating (1=Low, 10=High)",
                description="Bubble size represents market share. Competitor A dominates with 30% share despite premium pricing. Your company offers high quality at mid-range prices but holds only 12% market share.",
                category="Market Analysis",
                data_points=[
                    {"x": 6, "y": 8, "r": 12, "label": "Your Company", "group": "Your Company", "color": "#00ff88"},
                    {"x": 8, "y": 8, "r": 30, "label": "Competitor A", "group": "Direct Competitors", "color": "#ff6b6b"},
                    {"x": 7, "y": 7, "r": 22, "label": "Competitor B", "group": "Direct Competitors", "color": "#ff6b6b"},
                    {"x": 5, "y": 6, "r": 15, "label": "Competitor C", "group": "Direct Competitors", "color": "#ff6b6b"},
                    {"x": 4, "y": 5, "r": 8, "label": "Competitor D", "group": "Indirect Competitors", "color": "#ffd93d"}
                ],
                x_min=0,
                x_max=10,
                y_min=0,
                y_max=10
            )

        Use Cases:
            - Market positioning with market share (size = market share, x = price, y = quality)
            - Growth vs profitability analysis (size = revenue, x = growth rate, y = profit margin)
            - Risk-return analysis (size = investment amount, x = risk level, y = expected return)
            - Product portfolio analysis (size = revenue, x = market growth, y = market share)
            - Customer segment analysis (size = segment size, x = acquisition cost, y = lifetime value)

        Best Practices:
            - Clearly explain what bubble size represents in description
            - Use consistent bubble size scale (market share %, revenue $M, etc.)
            - Keep bubble sizes distinguishable (avoid too large or too small)
            - Use "#00ff88" (green) for your company
            - Include legend to explain groups
            - Limit to 5-10 bubbles for readability
            - Ensure axis labels are clear and include scale info
        """
        # Group data points by group for datasets
        groups = {}
        for point in data_points:
            group_name = point.get("group", "Data Points")
            if group_name not in groups:
                groups[group_name] = {
                    "label": group_name,
                    "data": [],
                    "backgroundColor": point.get("color", "#6b8cff"),
                    "borderColor": point.get("color", "#6b8cff")
                }
            groups[group_name]["data"].append({
                "x": point["x"],
                "y": point["y"],
                "r": point["r"],
                "label": point["label"]
            })

        payload = {
            "title": title,
            "graphType": "bubble",
            "data": {
                "datasets": list(groups.values())
            },
            "options": {
                "scales": {
                    "x": {
                        "title": {"display": True, "text": x_axis_label},
                        "min": x_min,
                        "max": x_max
                    },
                    "y": {
                        "title": {"display": True, "text": y_axis_label},
                        "min": y_min,
                        "max": y_max
                    }
                },
                "plugins": {
                    "legend": {"display": True, "position": "top"}
                }
            }
        }

        if description:
            payload["description"] = description
        if category:
            payload["category"] = category

        return self._send_update("show_graph", payload)

    @tool
    def show_notification(
        self,
        message: str,
        type: NotificationType = "info"
    ) -> str:
        """
        Display a toast notification to the user.

        Use this tool to show brief status updates, confirmations, or alerts to the user.
        Notifications appear as toast messages that auto-dismiss after a few seconds.

        Args:
            message: The notification message to display (keep concise, 1-2 sentences)
            type: Notification type affecting color and icon:
                - "info": General information (blue)
                - "success": Success confirmation (green)
                - "warning": Warning or caution (yellow/orange)
                - "error": Error message (red)

        Returns:
            Success or error message

        Examples:
            # Inform user about progress
            show_notification(
                message="Found 10 competitors in the education technology sector",
                type="info"
            )

            # Confirm successful action
            show_notification(
                message="Competitor analysis completed successfully",
                type="success"
            )

            # Warn about issues
            show_notification(
                message="Limited data available for this competitor",
                type="warning"
            )

            # Report errors
            show_notification(
                message="Failed to fetch pricing data for this product",
                type="error"
            )

        Use Cases:
            - Notify user about task completion
            - Confirm data has been saved
            - Warn about incomplete or missing data
            - Alert about errors or failures
            - Provide status updates during long operations

        Best Practices:
            - Keep messages brief and actionable
            - Use "info" for general updates
            - Use "success" for confirmations
            - Use "warning" for non-critical issues
            - Use "error" for failures requiring attention
            - Don't overuse - reserve for important updates
        """
        payload = {
            "message": message,
            "type": type
        }

        return self._send_update("show_notification", payload)

    @tool
    def show_progress(
        self,
        message: str,
        percentage: Optional[int] = None
    ) -> str:
        """
        Display a progress indicator for long-running tasks.

        Use this tool to show progress updates during multi-step operations like competitor
        analysis, market research, or data gathering. Helps keep users informed during
        tasks that take more than a few seconds.

        Args:
            message: Progress message to display (e.g., "Analyzing competitor 3 of 10...")
            percentage: Optional progress percentage (0-100). If not provided, shows indeterminate progress.

        Returns:
            Success or error message

        Examples:
            # Show indeterminate progress
            show_progress(
                message="Searching for competitors in your market..."
            )

            # Show specific progress
            show_progress(
                message="Analyzing competitor 3 of 10: Competitor C",
                percentage=30
            )

            # Update progress during analysis
            show_progress(
                message="Gathering pricing data...",
                percentage=60
            )

            # Near completion
            show_progress(
                message="Finalizing analysis results...",
                percentage=95
            )

        Use Cases:
            - Multi-step competitor analysis
            - Batch processing multiple competitors
            - Long-running research tasks
            - Data gathering from multiple sources
            - Report generation

        Best Practices:
            - Update regularly during long operations (every step or every 10-20%)
            - Use descriptive messages that explain current step
            - Include progress count when iterating (e.g., "3 of 10")
            - Use percentage for determinate progress (when total is known)
            - Don't use percentage for indeterminate tasks
            - Consider following with show_notification when complete
        """
        payload = {
            "message": message
        }

        if percentage is not None:
            payload["percentage"] = max(0, min(100, percentage))  # Clamp to 0-100

        return self._send_update("show_progress", payload)

    @tool
    def highlight_element(
        self,
        element_id: ElementIdType,
        duration: int = 4000
    ) -> str:
        """
        Draw user attention to specific dashboard panels with a pulsing glow animation.

        Use this tool to guide user attention to relevant sections of the dashboard after
        updating their content. The highlighted element will display a prismatic color-cycling
        glow that automatically removes after the specified duration.

        Args:
            element_id: ID of the dashboard element to highlight:
                - "chat-interface": Main chat conversation panel (left side, 2/3 width)
                - "insights-panel": Key insights panel displaying AI-generated strategic insights (right side)
                - "dynamic-ui-overlay": Floating overlay in bottom-right showing real-time cards and progress
                - "competitor-carousel-minimized": Minimized floating competitor carousel button
            duration: Duration of highlight animation in milliseconds (default: 4000ms / 4 seconds)

        Returns:
            Success or error message

        Examples:
            # Highlight insights panel after showing new insights
            highlight_element(
                element_id="insights-panel",
                duration=3000
            )

            # Draw attention to dynamic overlay with graphs
            highlight_element(
                element_id="dynamic-ui-overlay",
                duration=4000
            )

            # Highlight minimized competitor carousel
            highlight_element(
                element_id="competitor-carousel-minimized",
                duration=3000
            )

        Use Cases:
            - Highlight insights panel after using show_insight
            - Draw attention to competitor carousel after using show_competitor
            - Guide user to dynamic overlay when showing graphs
            - Direct attention to relevant panels during multi-step analysis

        Best Practices:
            - Highlight panels AFTER updating their content (e.g., after show_insight, then highlight_element)
            - Use for guiding attention during multi-step workflows
            - Don't over-highlight - max 1-2 times per analysis flow
            - Use reasonable durations (3-5 seconds)
            - Coordinate with related UI update tools for cohesive UX

        Animation Details:
            - Prismatic color-cycling glow effect
            - Cycles through cyan → purple → pink → green
            - 2 complete color cycles over the duration
            - Automatically removes after specified time
            - Non-intrusive - doesn't block user interaction
        """
        payload = {
            "element_id": element_id,
            "duration": duration
        }

        return self._send_update("highlight_element", payload)
