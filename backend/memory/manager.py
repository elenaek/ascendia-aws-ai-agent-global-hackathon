"""
Memory Manager for AWS Bedrock AgentCore Memory

This module provides a singleton MemoryManager to create and manage
memory resources for the business analyst agent.
"""
import os
import logging
from typing import Optional, Dict, Any
from functools import lru_cache

from bedrock_agentcore_starter_toolkit.operations.memory.manager import MemoryManager
from bedrock_agentcore_starter_toolkit.operations.memory.models.strategies import SemanticStrategy

logger = logging.getLogger(__name__)

# Configuration
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
MEMORY_NAME = os.getenv("MEMORY_NAME", "business_analyst_memory")

# Singleton instance
_memory_manager_instance: Optional[MemoryManager] = None
_memory_resource: Optional[Dict[str, Any]] = None


@lru_cache(maxsize=1)
def get_memory_manager() -> MemoryManager:
    """
    Get or create a singleton MemoryManager instance.

    Returns:
        MemoryManager: Configured memory manager instance
    """
    global _memory_manager_instance

    if _memory_manager_instance is None:
        logger.info(f"Initializing MemoryManager for region: {AWS_REGION}")
        _memory_manager_instance = MemoryManager(region_name=AWS_REGION)

    return _memory_manager_instance


def get_or_create_memory_resource() -> Dict[str, Any]:
    """
    Get or create the memory resource for the business analyst agent.

    Uses SemanticStrategy to automatically extract and store insights from conversations.
    Memory is isolated per user using actor-based namespaces.

    Returns:
        dict: Memory resource metadata including id, name, strategies
    """
    global _memory_resource

    if _memory_resource is not None:
        return _memory_resource

    try:
        manager = get_memory_manager()

        logger.info(f"Getting or creating memory resource: {MEMORY_NAME}")

        # Create memory with semantic strategy for long-term insight extraction
        _memory_resource = manager.get_or_create_memory(
            name=MEMORY_NAME,
            description="Memory store for business analyst agent - stores conversation history and extracted competitive insights",
            strategies=[
                SemanticStrategy(
                    name="semanticLongTermMemory",
                    # Actor-based namespace ensures memory isolation per user (identity_id)
                    namespaces=['/strategies/{memoryStrategyId}/actors/{actorId}']
                )
            ]
        )

        memory_id = _memory_resource.get("id")
        logger.info(f"Memory resource ready. ID: {memory_id}")

        return _memory_resource

    except Exception as e:
        logger.error(f"Failed to create/get memory resource: {str(e)}")
        raise


def get_memory_id() -> str:
    """
    Get the memory resource ID.

    Returns:
        str: Memory resource ID
    """
    resource = get_or_create_memory_resource()
    return resource.get("id")


# Initialize memory resource on module import (lazy initialization)
# This ensures memory is ready when needed but doesn't block import
def initialize_memory():
    """
    Explicitly initialize memory resource.
    Call this during application startup to fail fast if memory setup fails.
    """
    try:
        get_or_create_memory_resource()
        logger.info("Memory resource initialized successfully")
    except Exception as e:
        logger.error(f"Memory initialization failed: {str(e)}")
        raise
