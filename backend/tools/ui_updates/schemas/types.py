"""
Type definitions for UI updates.
"""
from typing import Literal

# Message types for WebSocket communication
MessageType = Literal[
    "show_competitor_context",
    "show_insight",
    "show_notification",
    "show_progress",
    "highlight_element",
    "show_graph"
]

# Notification types
NotificationType = Literal["info", "success", "warning", "error"]

# Severity levels for insights
SeverityType = Literal["info", "success", "warning"]

# Element IDs for highlighting
ElementIdType = Literal[
    "chat-interface",
    "insights-panel",
    "dynamic-ui-overlay",
    "competitor-carousel-minimized"
]

# Chart types
ChartType = Literal["scatter", "bar", "line", "radar", "pie", "doughnut", "bubble"]
