"""
Memory Session Handler for AWS Bedrock AgentCore Memory

This module manages memory sessions for individual users and conversations,
implementing smart retrieval patterns to prevent context bloat.
"""
import os
import re
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

from bedrock_agentcore.memory.session import MemorySessionManager
from bedrock_agentcore.memory.constants import ConversationalMessage, MessageRole

from memory.manager import get_memory_id, AWS_REGION

logger = logging.getLogger(__name__)

# Configuration - Maximum number of recent turns to retrieve (prevents context bloat)
MAX_RECENT_TURNS = int(os.getenv("MAX_RECENT_TURNS", "10"))


def strip_thinking_tags(text: str) -> str:
    """
    Remove <thinking>...</thinking> tags and their content from text.
    Handles multiline thinking blocks.

    Args:
        text: Text that may contain thinking tags

    Returns:
        Cleaned text with thinking tags and content removed
    """
    if not text:
        return text

    # Remove thinking tags and everything between them
    cleaned = re.sub(r'<thinking>.*?</thinking>', '', text, flags=re.DOTALL)
    # Clean up any extra whitespace left behind (multiple blank lines)
    cleaned = re.sub(r'\n\s*\n\s*\n+', '\n\n', cleaned)
    return cleaned.strip()


class AgentMemorySession:
    """
    Wrapper for MemorySessionManager with smart retrieval patterns.

    Manages both short-term (recent conversation) and long-term (semantic insights)
    memory for a specific user session.
    """

    def __init__(self, actor_id: str, session_id: str):
        """
        Initialize a memory session for a specific user and conversation.

        Args:
            actor_id: User identifier (typically Cognito identity_id)
            session_id: Unique session identifier for this conversation
        """
        self.actor_id = actor_id
        self.session_id = session_id
        self.memory_id = get_memory_id()

        logger.info(f"Initializing memory session for actor={actor_id}, session={session_id}")

        try:
            # Create session manager
            self.session_manager = MemorySessionManager(
                memory_id=self.memory_id,
                region_name=AWS_REGION
            )

            # Create or retrieve existing session
            self.session = self.session_manager.create_memory_session(
                actor_id=actor_id,
                session_id=session_id
            )

            logger.info(f"Memory session ready for actor={actor_id}")

        except Exception as e:
            logger.error(f"Failed to initialize memory session: {str(e)}")
            raise

    def add_conversation_turn(
        self,
        user_message: str,
        assistant_message: str
    ) -> bool:
        """
        Store a conversation turn (user message + assistant response) in memory.

        Args:
            user_message: The user's message
            assistant_message: The assistant's response

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Strip thinking tags from both messages (defensive - should already be clean)
            clean_user_message = strip_thinking_tags(user_message)
            clean_assistant_message = strip_thinking_tags(assistant_message)

            self.session.add_turns(
                messages=[
                    ConversationalMessage(clean_user_message, MessageRole.USER),
                    ConversationalMessage(clean_assistant_message, MessageRole.ASSISTANT)
                ]
            )

            logger.info(f"Stored conversation turn for session={self.session_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to store conversation turn: {str(e)}")
            return False

    def get_recent_context(self, k: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Retrieve the last K conversation turns (smart retrieval to prevent bloat).

        This method implements the recommended pattern of limiting context window
        by only retrieving recent turns instead of entire conversation history.

        Args:
            k: Number of recent turns to retrieve (default: MAX_RECENT_TURNS)

        Returns:
            List of recent conversation turns with role and content
        """
        if k is None:
            k = MAX_RECENT_TURNS

        try:
            recent_turns = self.session.get_last_k_turns(k=k)

            logger.info(f"Retrieved {len(recent_turns)} recent turns (limit={k})")

            # Format turns for easier consumption
            # get_last_k_turns returns a list of lists, where each inner list
            # is a conversation turn containing message dictionaries
            # Structure: [[{content: {text: "..."}, role: "USER"}, {content: {text: "..."}, role: "ASSISTANT"}], ...]
            formatted_turns = []

            for turn in recent_turns:
                # Each turn is a list of messages
                if isinstance(turn, list):
                    for message in turn:
                        role = message.get("role", "unknown")
                        content_obj = message.get("content", {})
                        content = content_obj.get("text", "") if isinstance(content_obj, dict) else str(content_obj)

                        # Strip thinking tags from retrieved content (handles old stored content)
                        content = strip_thinking_tags(content)

                        formatted_turns.append({
                            "role": role,
                            "content": content,
                            "timestamp": None  # Not available in this format
                        })

            return formatted_turns

        except Exception as e:
            logger.error(f"Failed to retrieve recent context: {str(e)}")
            import traceback
            traceback.print_exc()
            return []

    def search_relevant_insights(
        self,
        query: str,
        max_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Semantically search long-term memory for relevant insights.

        Uses semantic search to find the most relevant past insights/facts
        without retrieving entire conversation history.

        Args:
            query: Natural language query to search for relevant memories
            max_results: Maximum number of results to return

        Returns:
            List of relevant long-term memory records
        """
        try:
            # Build namespace prefix for this actor
            # Format: /strategies/{memoryStrategyId}/actors/{actorId}
            namespace_prefix = f"/strategies/semanticLongTermMemory/actors/{self.actor_id}"

            # Search long-term memory semantically
            search_results = self.session.search_long_term_memories(
                namespace_prefix=namespace_prefix,
                query=query,
                max_results=max_results
            )

            logger.info(f"Found {len(search_results)} relevant insights for query: {query[:50]}...")

            return search_results

        except Exception as e:
            logger.error(f"Failed to search long-term memories: {str(e)}")
            import traceback
            traceback.print_exc()
            return []

    def list_all_insights(self, max_results: int = 10) -> List[Dict[str, Any]]:
        """
        List recent long-term memory records.

        Use sparingly - prefer semantic search for better relevance.

        Args:
            max_results: Maximum number of records to return

        Returns:
            List of long-term memory records
        """
        try:
            records = self.session.list_long_term_memory_records()

            logger.info(f"Retrieved {len(records)} long-term memory records")

            # Limit results
            return records[:max_results]

        except Exception as e:
            logger.error(f"Failed to list long-term memories: {str(e)}")
            import traceback
            traceback.print_exc()
            return []

    def get_memory_summary(
        self,
        recent_turns_k: Optional[int] = None,
        search_query: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get a comprehensive memory summary combining recent context and insights.

        This is the primary method for retrieving memory to inject into the agent.
        It combines:
        - Short-term: Last K conversation turns
        - Long-term: Semantically relevant insights

        Args:
            recent_turns_k: Number of recent turns (default: MAX_RECENT_TURNS)
            search_query: Query for semantic search of insights (optional)

        Returns:
            Dictionary with 'recent_context' and 'relevant_insights'
        """
        recent_context = self.get_recent_context(k=recent_turns_k)

        relevant_insights = []
        if search_query:
            relevant_insights = self.search_relevant_insights(query=search_query)

        summary = {
            "recent_context": recent_context,
            "relevant_insights": relevant_insights,
            "actor_id": self.actor_id,
            "session_id": self.session_id,
            "retrieved_at": datetime.utcnow().isoformat()
        }

        logger.info(
            f"Memory summary: {len(recent_context)} recent turns, "
            f"{len(relevant_insights)} relevant insights"
        )

        return summary

    def format_memory_for_prompt(
        self,
        recent_turns_k: Optional[int] = None,
        search_query: Optional[str] = None
    ) -> str:
        """
        Format memory summary as a string for injection into agent prompt.

        Args:
            recent_turns_k: Number of recent turns (default: MAX_RECENT_TURNS)
            search_query: Query for semantic search of insights (optional)

        Returns:
            Formatted string ready for prompt injection
        """
        summary = self.get_memory_summary(
            recent_turns_k=recent_turns_k,
            search_query=search_query
        )

        lines = []

        # Add recent conversation context
        if summary["recent_context"]:
            lines.append("## Recent Conversation History")
            lines.append(f"The following are the last {len(summary['recent_context'])} messages from this conversation (displayed in order of oldest to newest):")
            lines.append("")  # blank line
            for idx, turn in enumerate(summary["recent_context"][::-1], 1):
                role = turn["role"].upper()
                content = turn["content"]
                lines.append(f"**{idx} - {role}**: {content}")
                lines.append("")  # blank line between turns

        # Add relevant insights from long-term memory
        if summary["relevant_insights"]:
            lines.append("## Relevant Insights from Past Sessions")
            lines.append("The following insights were extracted from previous conversations:")
            lines.append("")
            for idx, insight in enumerate(summary["relevant_insights"], 1):
                content = insight.get("content", insight.get("text", ""))
                # Strip thinking tags from insight content
                content = strip_thinking_tags(content)
                lines.append(f"{idx}. {content}")
                lines.append("")

        if not lines:
            return "## Memory Context\n\nNo previous conversation history available. This is the start of a new conversation."

        return "\n".join(lines)


def create_or_get_session(actor_id: str, session_id: str) -> AgentMemorySession:
    """
    Factory function to create or retrieve a memory session.

    Args:
        actor_id: User identifier (typically Cognito identity_id)
        session_id: Unique session identifier

    Returns:
        AgentMemorySession instance
    """
    return AgentMemorySession(actor_id=actor_id, session_id=session_id)
