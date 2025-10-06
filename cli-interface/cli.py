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
import boto3
import atexit


def cleanup(refresh_token: str | None):
    if(refresh_token):
        print("Revoking refresh token...")
        try:
            idp_client = boto3.client('cognito-idp', region_name=os.getenv("AWS_REGION"))
            idp_client.revoke_token(
                ClientId=os.getenv("COGNITO_CLIENT_ID"),
                Token=refresh_token
            )
            print("Refresh token revoked successfully!")
        except idp_client.exceptions.TokenNotFoundException:
            print("Token not found or already revoked.")
        except Exception as e:
            print(f"Error revoking token: {e}")

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
        self.show_thinking_enabled = show_thinking
        self.current_section = None

        # Content accumulation for thinking detection
        self.content_buffer = ""
        self.display_position = 0  # Position up to which we've displayed content
        self.in_thinking = False

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

        # Content events
        elif event.type == EventType.CONTENT_BLOCK_START:
            self._start_section("content")
            # Reset buffers for new content block
            self.content_buffer = ""
            self.display_position = 0
            self.in_thinking = False
            content_type = event.data.get("type", "text")
            if content_type == "text":
                print(f"\n{Fore.GREEN}💬 Response:{Style.RESET_ALL}\n")
        elif event.type == EventType.CONTENT_BLOCK_DELTA:
            # Auto-start content section if not already started
            if self.current_section != "content":
                self._start_section("content")
                # Reset buffers for new content block
                self.content_buffer = ""
                self.display_position = 0
                self.in_thinking = False
                print(f"\n{Fore.GREEN}💬 Response:{Style.RESET_ALL}\n")
            text = event.get_text()
            if text:
                self._handle_content_with_thinking(text)
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

    def _is_partial_tag(self, buffer_end: str) -> bool:
        """Check if buffer ends with a partial tag"""
        potential_tags = ["<thinking>", "</thinking>"]
        for tag in potential_tags:
            for i in range(1, len(tag)):
                if buffer_end.endswith(tag[:i]):
                    return True
        return False

    def _handle_content_with_thinking(self, text: str):
        """Handle content delta, detecting and displaying thinking tags"""
        if not text:
            return

        # Add new text to buffer
        self.content_buffer += text

        # Find thinking tags in the entire buffer
        thinking_start_idx = self.content_buffer.find("<thinking>")
        thinking_end_idx = self.content_buffer.find("</thinking>")

        # Determine how much we can safely display
        if not self.in_thinking:
            # Not in thinking mode
            if thinking_start_idx != -1:
                # Found opening tag - display everything before it
                before_thinking = self.content_buffer[self.display_position:thinking_start_idx]
                if before_thinking:
                    print(f"{before_thinking}", end="", flush=True)

                # Start thinking mode
                self.in_thinking = True
                if self.show_thinking_enabled:
                    print(f"\n{Fore.CYAN}🤔 Thinking...{Style.RESET_ALL}\n", end="", flush=True)

                self.display_position = thinking_start_idx + len("<thinking>")

                # Check if we have the closing tag too
                if thinking_end_idx != -1 and thinking_end_idx > thinking_start_idx:
                    # Complete thinking block
                    thinking_content = self.content_buffer[self.display_position:thinking_end_idx]
                    if self.show_thinking_enabled and thinking_content:
                        print(f"{Fore.CYAN}{thinking_content}{Style.RESET_ALL}", end="", flush=True)
                    if self.show_thinking_enabled:
                        print(f"\n{Fore.CYAN}{'─' * 50}{Style.RESET_ALL}\n", end="", flush=True)

                    self.in_thinking = False
                    self.display_position = thinking_end_idx + len("</thinking>")

                    # Recursively process remaining content
                    remaining = self.content_buffer[self.display_position:]
                    if remaining and not self._is_partial_tag(remaining):
                        print(f"{remaining}", end="", flush=True)
                        self.display_position = len(self.content_buffer)
                else:
                    # Only opening tag, show partial thinking content but check for partial closing tag
                    content_after_open = self.content_buffer[self.display_position:]

                    # Check if buffer ends with partial closing tag
                    if self._is_partial_tag(content_after_open):
                        # Hold back the partial tag
                        safe_end = len(self.content_buffer)
                        for i in range(1, len("</thinking>")):
                            if self.content_buffer.endswith("</thinking>"[:i]):
                                safe_end = len(self.content_buffer) - i
                                break
                        safe_content = self.content_buffer[self.display_position:safe_end]
                        if self.show_thinking_enabled and safe_content:
                            print(f"{Fore.CYAN}{safe_content}{Style.RESET_ALL}", end="", flush=True)
                        self.display_position = safe_end
                    else:
                        # No partial tag, display all
                        if self.show_thinking_enabled and content_after_open:
                            print(f"{Fore.CYAN}{content_after_open}{Style.RESET_ALL}", end="", flush=True)
                        self.display_position = len(self.content_buffer)
            else:
                # No opening tag found yet
                # Check if buffer ends with partial opening tag
                undisplayed = self.content_buffer[self.display_position:]

                if self._is_partial_tag(undisplayed):
                    # Hold back potential partial tag
                    safe_end = len(self.content_buffer)
                    for i in range(1, len("<thinking>")):
                        if self.content_buffer.endswith("<thinking>"[:i]):
                            safe_end = len(self.content_buffer) - i
                            break
                    safe_content = self.content_buffer[self.display_position:safe_end]
                    if safe_content:
                        print(f"{safe_content}", end="", flush=True)
                    self.display_position = safe_end
                else:
                    # Safe to display everything
                    if undisplayed:
                        print(f"{undisplayed}", end="", flush=True)
                    self.display_position = len(self.content_buffer)
        else:
            # In thinking mode - looking for closing tag
            if thinking_end_idx != -1:
                # Found closing tag
                thinking_content = self.content_buffer[self.display_position:thinking_end_idx]
                if self.show_thinking_enabled and thinking_content:
                    print(f"{Fore.CYAN}{thinking_content}{Style.RESET_ALL}", end="", flush=True)
                if self.show_thinking_enabled:
                    print(f"\n{Fore.CYAN}{'─' * 50}{Style.RESET_ALL}\n", end="", flush=True)

                self.in_thinking = False
                self.display_position = thinking_end_idx + len("</thinking>")

                # Process any remaining content
                remaining = self.content_buffer[self.display_position:]
                if remaining and not self._is_partial_tag(remaining):
                    print(f"{remaining}", end="", flush=True)
                    self.display_position = len(self.content_buffer)
            else:
                # Still in thinking, no closing tag yet
                content_after_display = self.content_buffer[self.display_position:]

                # Check for partial closing tag
                if self._is_partial_tag(content_after_display):
                    # Hold back the partial tag
                    safe_end = len(self.content_buffer)
                    for i in range(1, len("</thinking>")):
                        if self.content_buffer.endswith("</thinking>"[:i]):
                            safe_end = len(self.content_buffer) - i
                            break
                    safe_content = self.content_buffer[self.display_position:safe_end]
                    if self.show_thinking_enabled and safe_content:
                        print(f"{Fore.CYAN}{safe_content}{Style.RESET_ALL}", end="", flush=True)
                    self.display_position = safe_end
                else:
                    # No partial tag, display all thinking content
                    if self.show_thinking_enabled and content_after_display:
                        print(f"{Fore.CYAN}{content_after_display}{Style.RESET_ALL}", end="", flush=True)
                    self.display_position = len(self.content_buffer)

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
        "--client-id",
        help="Client ID to use",
        default=os.getenv("COGNITO_CLIENT_ID")
    )
    parser.add_argument(
        "--username",
        help="Username to use",
        default=os.getenv("COGNITO_USERNAME")
    )
    parser.add_argument(
        "--password",
        help="Password to use",
        default=os.getenv("COGNITO_PW")
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
    # print(args)

    # Validate arguments
    if not args.use_model and not args.agent_id:
        print(f"{Fore.RED}Error: Either --agent-id or --use-model must be specified{Style.RESET_ALL}")
        print("Set BEDROCK_AGENT_ID environment variable or use --agent-id flag")
        sys.exit(1)

    escaped_agent_arn = urllib.parse.quote(args.agent_arn, safe='')
    url = f"https://bedrock-agentcore.{args.region}.amazonaws.com/runtimes/{escaped_agent_arn}/invocations?qualifier=DEFAULT&stream=true"

    # Initialize the client
    try:
        idp_client = boto3.client('cognito-idp', region_name=args.region)
        res = idp_client.initiate_auth(
            ClientId=args.client_id,
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': args.username,
                'PASSWORD': args.password
            }
        )
        access_token = res['AuthenticationResult']['AccessToken']
        refresh_token = res['AuthenticationResult']['RefreshToken']
        atexit.register(cleanup, refresh_token=refresh_token)
        client = BedrockAgentCoreStreamClient(
            agent_id=args.agent_id or "dummy",  # Provide dummy ID if using model directly
            endpoint_url=url,
            auth_token=access_token or args.auth_token,
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