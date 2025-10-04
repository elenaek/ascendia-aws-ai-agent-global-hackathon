#!/usr/bin/env python3
"""
CLI demo for Bedrock AgentCore streaming response handler

This script demonstrates how to consume and display streaming responses
from AWS Bedrock AgentCore in a user-friendly CLI format.
"""

import os
import sys
import argparse
import json
import time
import urllib.parse
import string
import random
from typing import Optional
from colorama import init, Fore, Style, Back
from dotenv import load_dotenv

# Add parent directory to path to import our library
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.bedrock_agentcore_stream import BedrockAgentCoreStreamClient, EventType

# Initialize colorama for cross-platform colored output
init(autoreset=True)

# Load environment variables
load_dotenv()


class CLIStreamDisplay:
    """Handles the display of streaming events in the CLI"""

    def __init__(self, verbose: bool = False, show_thinking: bool = True):
        self.verbose = verbose
        self.show_thinking = show_thinking
        self.current_section = None
        self.content_buffer = []
        self.thinking_buffer = []

    def display_event(self, event):
        """Display a single stream event"""

        if self.verbose:
            # In verbose mode, show all events
            self._display_verbose_event(event)
        else:
            # In normal mode, show formatted output
            self._display_formatted_event(event)

    def _display_verbose_event(self, event):
        """Display event in verbose/debug format"""
        timestamp = time.strftime('%H:%M:%S', time.localtime(event.timestamp))

        # Color code by event type
        if event.type == EventType.ERROR:
            color = Fore.RED
        elif event.is_thinking:
            color = Fore.CYAN
        elif event.is_tool_use:
            color = Fore.YELLOW
        elif event.is_content:
            color = Fore.GREEN
        else:
            color = Fore.WHITE

        print(f"{Fore.BLUE}[{timestamp}]{Style.RESET_ALL} "
              f"{color}{event.type.value}{Style.RESET_ALL}")

        if event.data:
            print(f"  {Fore.WHITE}{json.dumps(event.data, indent=2)}{Style.RESET_ALL}")
        print()

    def _display_formatted_event(self, event):
        """Display event in user-friendly format"""
        # Message lifecycle events
        if event.type == EventType.MESSAGE_START:
            self._start_new_message(event)
        elif event.type == EventType.MESSAGE_STOP:
            self._finalize_message(event)

        # Thinking events
        elif event.type == EventType.THINKING_START and self.show_thinking:
            self._start_section("thinking")
            print(f"\n{Fore.CYAN}🤔 Thinking...{Style.RESET_ALL}")
        elif event.type == EventType.THINKING_DELTA and self.show_thinking:
            text = event.get_text()
            if text:
                print(f"{Fore.CYAN}{text}{Style.RESET_ALL}", end="", flush=True)
        elif event.type == EventType.THINKING_STOP and self.show_thinking:
            print(f"\n{Fore.CYAN}{'─' * 50}{Style.RESET_ALL}\n")
            self._end_section()

        # Content events
        elif event.type == EventType.CONTENT_BLOCK_START:
            self._start_section("content")
            content_type = event.data.get("type", "text")
            if content_type == "text":
                print(f"\n{Fore.GREEN}💬 Response:{Style.RESET_ALL}\n")
        elif event.type == EventType.CONTENT_BLOCK_DELTA:
            # Auto-start content section if not already started
            if self.current_section != "content":
                self._start_section("content")
                print(f"\n{Fore.GREEN}💬 Response:{Style.RESET_ALL}\n")
            text = event.get_text()
            if text:
                print(f"{text}", end="", flush=True)
        elif event.type == EventType.CONTENT_BLOCK_STOP:
            print()  # New line after content block
            self._end_section()

        # Tool use events
        elif event.type == EventType.TOOL_USE_START:
            self._start_section("tool")
            tool_name = event.data.get("name", "unknown")
            tool_id = event.data.get("id", "unknown")
            print(f"\n{Fore.YELLOW}🔧 Using tool: {tool_name}{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}   Tool ID: {tool_id}{Style.RESET_ALL}")
            # Store current tool for accumulating input
            self.current_tool_id = tool_id
            self.current_tool_input = ""
        elif event.type == EventType.TOOL_USE_DELTA:
            # Accumulate tool input using current_tool_id
            delta_input = event.data.get("delta", {}).get("input", "")
            if hasattr(self, 'current_tool_input'):
                self.current_tool_input += delta_input
        elif event.type == EventType.TOOL_USE_STOP:
            # Display accumulated tool input if available
            if hasattr(self, 'current_tool_input') and self.current_tool_input:
                try:
                    parsed_input = json.loads(self.current_tool_input)
                    print(f"{Fore.YELLOW}   Input: {json.dumps(parsed_input, indent=2)}{Style.RESET_ALL}")
                except json.JSONDecodeError:
                    print(f"{Fore.YELLOW}   Input: {self.current_tool_input}{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}   ✓ Tool completed{Style.RESET_ALL}")
            # Clear current tool state
            if hasattr(self, 'current_tool_id'):
                delattr(self, 'current_tool_id')
            if hasattr(self, 'current_tool_input'):
                delattr(self, 'current_tool_input')
            self._end_section()

        # Error events
        elif event.type == EventType.ERROR:
            self._display_error(event)

    def _start_new_message(self, event):
        """Handle the start of a new message"""
        model = event.data.get("model", "unknown")
        role = event.data.get("role", "assistant")
        print(f"\n{Fore.BLUE}{'=' * 60}{Style.RESET_ALL}")
        print(f"{Fore.BLUE}Model: {model} | Role: {role}{Style.RESET_ALL}")
        print(f"{Fore.BLUE}{'=' * 60}{Style.RESET_ALL}")

    def _finalize_message(self, event):
        """Handle the end of a message"""
        print(f"\n{Fore.BLUE}{'=' * 60}{Style.RESET_ALL}")

        # Display usage statistics if available
        usage = event.data.get("usage")
        if usage:
            print(f"{Fore.MAGENTA}📊 Usage:{Style.RESET_ALL}")
            print(f"   Input tokens: {usage.get('inputTokens', 'N/A')}")
            print(f"   Output tokens: {usage.get('outputTokens', 'N/A')}")
            print(f"   Total tokens: {usage.get('totalTokens', 'N/A')}")

        stop_reason = event.data.get("stop_reason")
        if stop_reason:
            print(f"{Fore.MAGENTA}Stop reason: {stop_reason}{Style.RESET_ALL}")

        print(f"{Fore.BLUE}{'=' * 60}{Style.RESET_ALL}\n")

    def _display_error(self, event):
        """Display error event"""
        print(f"\n{Back.RED}{Fore.WHITE} ERROR {Style.RESET_ALL}")
        error_msg = event.data.get("error", "Unknown error")
        error_code = event.data.get("error_code", "")
        print(f"{Fore.RED}❌ {error_msg}{Style.RESET_ALL}")
        if error_code:
            print(f"{Fore.RED}   Error code: {error_code}{Style.RESET_ALL}")
        print()

    def _start_section(self, section_type: str):
        """Mark the start of a new section"""
        self.current_section = section_type

    def _end_section(self):
        """Mark the end of the current section"""
        self.current_section = None


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="CLI demo for Bedrock AgentCore streaming responses"
    )

    # Connection arguments
    parser.add_argument(
        "--agent-id",
        help="Agent ID to invoke",
        default=os.getenv("BEDROCK_AGENT_ID")
    )
    parser.add_argument(
        "--api-key",
        help="API key to use",
        default=os.getenv("AWS_BEARER_TOKEN_BEDROCK")
    )
    parser.add_argument(
        "--auth-token",
        help="Auth token to use",
        default=os.getenv("AGENTCORE_TOKEN")
    )
    parser.add_argument(
        "--agent-arn",
        help="Agent ARN",
        default=os.getenv("BEDROCK_AGENT_ARN")
    )
    parser.add_argument(
        "--region",
        help="AWS region",
        default=os.getenv("AWS_REGION", "us-east-1")
    )
    parser.add_argument(
        "--profile",
        help="AWS profile to use",
        default=os.getenv("AWS_PROFILE")
    )

    # Model invocation (for testing without agent)
    parser.add_argument(
        "--model-id",
        help="Model ID to use (for direct model invocation)",
        default=os.getenv("BEDROCK_MODEL_ID", "us.amazon.nova-pro-v1:0")
    )
    parser.add_argument(
        "--use-model",
        action="store_true",
        help="Use direct model invocation instead of agent"
    )

    # Display options
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show verbose event details"
    )
    parser.add_argument(
        "--no-thinking",
        action="store_true",
        help="Hide thinking/reasoning output"
    )

    # Input options
    parser.add_argument(
        "prompt",
        nargs="?",
        help="Prompt to send to the agent/model"
    )
    parser.add_argument(
        "--interactive", "-i",
        action="store_true",
        help="Interactive mode - keep conversation going",
        default=True
    )
    parser.add_argument(
        "--session-id",
        help="Session ID for conversation continuity",
        default=''.join(random.choice(string.ascii_letters + string.digits) for _ in range(36))
    )

    args = parser.parse_args()
    print(args)

    # Validate arguments
    if not args.use_model and not args.agent_id:
        print(f"{Fore.RED}Error: Either --agent-id or --use-model must be specified{Style.RESET_ALL}")
        print("Set BEDROCK_AGENT_ID environment variable or use --agent-id flag")
        sys.exit(1)

    escaped_agent_arn = urllib.parse.quote(args.agent_arn, safe='')
    url = f"https://bedrock-agentcore.{args.region}.amazonaws.com/runtimes/{escaped_agent_arn}/invocations?qualifier=DEFAULT&stream=true"

    # Initialize the client
    try:
        client = BedrockAgentCoreStreamClient(
            agent_id=args.agent_id or "dummy",  # Provide dummy ID if using model directly
            endpoint_url=url,
            auth_token=args.auth_token,
            session_id=args.session_id
        )

        display = CLIStreamDisplay(
            verbose=args.verbose,
            show_thinking=not args.no_thinking
        )

        print(f"{Fore.GREEN}✓ Connected to AWS Bedrock{Style.RESET_ALL}")
        if args.use_model:
            print(f"  Using model: {args.model_id}")
        else:
            print(f"  Agent ID: {args.agent_id}")
        print(f"  Region: {args.region}")
        print()

    except Exception as e:
        print(f"{Fore.RED}Failed to initialize client: {e}{Style.RESET_ALL}")
        sys.exit(1)

    # Process prompts
    if args.interactive:
        print(f"{Fore.CYAN}Interactive mode - Type 'exit' to quit{Style.RESET_ALL}\n")
        session_id = args.session_id

        while True:
            try:
                prompt = input(f"{Fore.GREEN}You: {Style.RESET_ALL}")
                if prompt.lower() in ['exit', 'quit', 'bye']:
                    print(f"{Fore.YELLOW}Goodbye!{Style.RESET_ALL}")
                    break

                if not prompt.strip():
                    continue

                # Process the prompt
                if args.use_model:
                    # Direct model invocation
                    messages = [{"role": "user", "content": [{"text": prompt}]}]
                    stream = client.invoke_model_stream(
                        model_id=args.model_id,
                        messages=messages
                    )
                else:
                    # Agent invocation
                    stream = client.invoke_agent_stream(
                        prompt=prompt,
                    )

                # Display streaming response
                for event in stream:
                    display.display_event(event)

            except KeyboardInterrupt:
                print(f"\n{Fore.YELLOW}Interrupted{Style.RESET_ALL}")
                break
            except Exception as e:
                print(f"{Fore.RED}Error: {e}{Style.RESET_ALL}")

    else:
        # Single prompt mode
        prompt = args.prompt
        if not prompt:
            prompt = input(f"{Fore.GREEN}Enter prompt: {Style.RESET_ALL}")

        try:
            if args.use_model:
                # Direct model invocation
                messages = [{"role": "user", "content": [{"text": prompt}]}]
                stream = client.invoke_model_stream(
                    model_id=args.model_id,
                    messages=messages
                )
            else:
                # Agent invocation
                stream = client.invoke_agent_stream(
                    prompt=prompt,
                    session_id=args.session_id
                )

            # Display streaming response
            for event in stream:
                display.display_event(event)

        except Exception as e:
            print(f"{Fore.RED}Error: {e}{Style.RESET_ALL}")
            sys.exit(1)


if __name__ == "__main__":
    main()