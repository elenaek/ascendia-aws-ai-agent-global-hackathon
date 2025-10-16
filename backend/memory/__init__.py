"""
Memory Module for AWS Bedrock AgentCore

This module provides memory management capabilities for the business analyst agent,
including both short-term (recent conversation) and long-term (semantic insights) memory.

Public API:
    - Manager functions: get_memory_manager, get_or_create_memory_resource, get_memory_id, initialize_memory
    - Session functions: AgentMemorySession, create_or_get_session
    - Utility functions: strip_thinking_tags
"""

from memory.manager import (
    get_memory_manager,
    get_or_create_memory_resource,
    get_memory_id,
    initialize_memory,
    AWS_REGION,
    MEMORY_NAME
)

from memory.session import (
    AgentMemorySession,
    create_or_get_session,
    strip_thinking_tags,
    MAX_RECENT_TURNS
)

__all__ = [
    # Manager exports
    'get_memory_manager',
    'get_or_create_memory_resource',
    'get_memory_id',
    'initialize_memory',
    'AWS_REGION',
    'MEMORY_NAME',
    # Session exports
    'AgentMemorySession',
    'create_or_get_session',
    'strip_thinking_tags',
    'MAX_RECENT_TURNS'
]
