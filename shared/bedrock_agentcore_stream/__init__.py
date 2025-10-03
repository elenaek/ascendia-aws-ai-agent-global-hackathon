"""
AWS Bedrock AgentCore Streaming Response Handler Library
"""

from .client import BedrockAgentCoreStreamClient
from .parser import StreamEventParser
from .types import StreamEvent, EventType

__version__ = "0.1.0"
__all__ = [
    "BedrockAgentCoreStreamClient",
    "StreamEventParser",
    "StreamEvent",
    "EventType"
]