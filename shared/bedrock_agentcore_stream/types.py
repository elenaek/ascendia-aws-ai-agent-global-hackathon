"""
Type definitions for Bedrock AgentCore streaming events
"""

from enum import Enum
from typing import Dict, Any, Optional, List
from dataclasses import dataclass


class EventType(Enum):
    """Types of events in the Bedrock AgentCore stream"""
    MESSAGE_START = "message_start"
    MESSAGE_DELTA = "message_delta"
    MESSAGE_STOP = "message_stop"
    CONTENT_BLOCK_START = "content_block_start"
    CONTENT_BLOCK_DELTA = "content_block_delta"
    CONTENT_BLOCK_STOP = "content_block_stop"
    THINKING_START = "thinking_start"
    THINKING_DELTA = "thinking_delta"
    THINKING_STOP = "thinking_stop"
    TOOL_USE_START = "tool_use_start"
    TOOL_USE_DELTA = "tool_use_delta"
    TOOL_USE_STOP = "tool_use_stop"
    TOOL_RESULT = "tool_result"
    ERROR = "error"
    PING = "ping"
    UNKNOWN = "unknown"


@dataclass
class StreamEvent:
    """Represents a single event in the stream"""
    type: EventType
    data: Dict[str, Any]
    raw_event: Optional[str] = None
    timestamp: Optional[float] = None

    @property
    def is_content(self) -> bool:
        """Check if this is a content event"""
        return self.type in [
            EventType.CONTENT_BLOCK_START,
            EventType.CONTENT_BLOCK_DELTA,
            EventType.CONTENT_BLOCK_STOP
        ]

    @property
    def is_thinking(self) -> bool:
        """Check if this is a thinking event"""
        return self.type in [
            EventType.THINKING_START,
            EventType.THINKING_DELTA,
            EventType.THINKING_STOP
        ]

    @property
    def is_tool_use(self) -> bool:
        """Check if this is a tool use event"""
        return self.type in [
            EventType.TOOL_USE_START,
            EventType.TOOL_USE_DELTA,
            EventType.TOOL_USE_STOP,
            EventType.TOOL_RESULT
        ]

    def get_text(self) -> Optional[str]:
        """Extract text content from the event if available"""
        if self.type == EventType.CONTENT_BLOCK_DELTA:
            return self.data.get("delta", {}).get("text", "")
        elif self.type == EventType.THINKING_DELTA:
            return self.data.get("delta", {}).get("text", "")
        elif self.type == EventType.MESSAGE_DELTA:
            return self.data.get("delta", {}).get("text", "")
        elif self.is_content and "content" in self.data:
            content = self.data.get("content", {})
            if isinstance(content, dict):
                return content.get("text", "")
        return None


@dataclass
class ContentBlock:
    """Represents a content block in the stream"""
    type: str  # "text", "tool_use", etc.
    text: Optional[str] = None
    tool_name: Optional[str] = None
    tool_input: Optional[Dict[str, Any]] = None
    tool_use_id: Optional[str] = None


@dataclass
class Message:
    """Represents a complete message assembled from stream events"""
    role: str
    content: List[ContentBlock]
    thinking: Optional[str] = None
    model: Optional[str] = None
    usage: Optional[Dict[str, int]] = None
    stop_reason: Optional[str] = None