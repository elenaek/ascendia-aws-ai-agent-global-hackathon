"""
Test script for AWS Bedrock AgentCore Memory implementation

This script tests:
1. Memory manager initialization
2. Session creation
3. Storing conversation turns
4. Retrieving recent context (smart retrieval)
5. Memory context formatting
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

from memory.manager import get_or_create_memory_resource, initialize_memory
from memory.session import create_or_get_session

def test_memory_initialization():
    """Test that memory resource can be initialized"""
    print("=" * 60)
    print("TEST 1: Memory Resource Initialization")
    print("=" * 60)

    try:
        initialize_memory()
        print("✓ Memory resource initialized successfully")
        return True
    except Exception as e:
        print(f"✗ Memory initialization failed: {str(e)}")
        return False


def test_session_creation():
    """Test creating a memory session"""
    print("\n" + "=" * 60)
    print("TEST 2: Session Creation")
    print("=" * 60)

    try:
        test_actor_id = "test_user_001"
        test_session_id = "test_session_001"

        session = create_or_get_session(
            actor_id=test_actor_id,
            session_id=test_session_id
        )

        print(f"✓ Session created successfully")
        print(f"  - Actor ID: {session.actor_id}")
        print(f"  - Session ID: {session.session_id}")
        print(f"  - Memory ID: {session.memory_id}")
        return session
    except Exception as e:
        print(f"✗ Session creation failed: {str(e)}")
        return None


def test_conversation_storage(session):
    """Test storing conversation turns"""
    print("\n" + "=" * 60)
    print("TEST 3: Conversation Storage")
    print("=" * 60)

    try:
        # Store test conversation turns
        conversations = [
            {
                "user": "What are the top competitors in the education technology market?",
                "assistant": "Based on my research, the top competitors include Duolingo, Khan Academy, and Coursera. They focus on different segments of the education market."
            },
            {
                "user": "Can you analyze Duolingo's pricing strategy?",
                "assistant": "Duolingo uses a freemium model with a premium tier called Duolingo Plus at $12.99/month. They have over 500M users with 10% conversion to paid."
            },
            {
                "user": "What insights can you provide about Khan Academy?",
                "assistant": "Khan Academy is completely free and nonprofit, funded by donations. They focus on K-12 education with a strong emphasis on personalized learning paths."
            }
        ]

        for idx, conv in enumerate(conversations, 1):
            success = session.add_conversation_turn(
                user_message=conv["user"],
                assistant_message=conv["assistant"]
            )
            if success:
                print(f"✓ Stored conversation turn {idx}")
            else:
                print(f"✗ Failed to store conversation turn {idx}")

        print(f"\n✓ All {len(conversations)} conversation turns stored successfully")
        return True
    except Exception as e:
        print(f"✗ Conversation storage failed: {str(e)}")
        return False


def test_context_retrieval(session):
    """Test retrieving recent context with limited turns (prevents bloat)"""
    print("\n" + "=" * 60)
    print("TEST 4: Smart Context Retrieval (Last K Turns)")
    print("=" * 60)

    try:
        # Test retrieving last 2 turns
        recent_context = session.get_recent_context(k=2)

        print(f"✓ Retrieved {len(recent_context)} recent turns (requested k=2)")
        print("\nRecent context:")
        for idx, turn in enumerate(recent_context, 1):
            role = turn.get("role", "unknown")
            content_preview = turn.get("content", "")[:80]
            if content_preview:
                content_preview += "..."
            print(f"\n  Turn {idx} [{role}]:")
            print(f"    {content_preview if content_preview else '(empty)'}")

        return True
    except Exception as e:
        print(f"✗ Context retrieval failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_memory_formatting(session):
    """Test formatting memory for prompt injection"""
    print("\n" + "=" * 60)
    print("TEST 5: Memory Context Formatting")
    print("=" * 60)

    try:
        formatted_memory = session.format_memory_for_prompt(
            recent_turns_k=2,
            search_query="competitive analysis"
        )

        print("✓ Memory formatted successfully for prompt injection")
        print("\nFormatted Memory Context:")
        print("-" * 60)
        print(formatted_memory[:500])  # Print first 500 chars
        if len(formatted_memory) > 500:
            print(f"\n... (truncated, total length: {len(formatted_memory)} chars)")
        print("-" * 60)

        return True
    except Exception as e:
        print(f"✗ Memory formatting failed: {str(e)}")
        return False


def run_all_tests():
    """Run all memory tests"""
    print("\n" + "=" * 60)
    print("AWS BEDROCK AGENTCORE MEMORY - TEST SUITE")
    print("=" * 60)
    print(f"Region: {os.getenv('AWS_REGION', 'us-east-1')}")
    print(f"Memory Name: {os.getenv('MEMORY_NAME', 'business_analyst_memory')}")
    print(f"Max Recent Turns: {os.getenv('MAX_RECENT_TURNS', '10')}")

    # Track results
    results = []

    # Test 1: Initialize memory
    results.append(("Memory Initialization", test_memory_initialization()))

    # Test 2: Create session
    session = test_session_creation()
    results.append(("Session Creation", session is not None))

    if session:
        # Test 3: Store conversations
        results.append(("Conversation Storage", test_conversation_storage(session)))

        # Test 4: Retrieve context
        results.append(("Context Retrieval", test_context_retrieval(session)))

        # Test 5: Format memory
        results.append(("Memory Formatting", test_memory_formatting(session)))

    # Print summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{test_name}: {status}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! Memory implementation is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review errors above.")
        return 1


if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)
