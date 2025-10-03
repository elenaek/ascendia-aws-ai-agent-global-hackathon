"""
Client for consuming Bedrock AgentCore streaming responses via HTTP/SSE
"""

import requests
import json
import logging
from typing import Generator, Optional, Dict, Any, Callable, Union
from urllib.parse import urljoin
from .parser import StreamEventParser, MessageAssembler
from .types import StreamEvent, EventType


logger = logging.getLogger(__name__)


class BedrockAgentCoreStreamClient:
    """Client for consuming AWS Bedrock AgentCore streaming responses via HTTP/SSE"""

    def __init__(
        self,
        endpoint_url: str,
        agent_id: Optional[str] = None,
        api_key: Optional[str] = None,
        auth_token: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None,
        session_id: Optional[str] = None,
        timeout: int = 30,
        verify_ssl: bool = True,
    ):
        """
        Initialize the Bedrock AgentCore streaming client

        Args:
            endpoint_url: The HTTP endpoint URL for the AgentCore agent
            agent_id: Optional agent ID if not included in endpoint
            api_key: Optional API key for authentication
            auth_token: Optional bearer token for authentication
            headers: Optional custom headers to include in requests
            timeout: Request timeout in seconds
            verify_ssl: Whether to verify SSL certificates
        """
        self.endpoint_url = endpoint_url.rstrip('/')
        self.agent_id = agent_id
        self.timeout = timeout
        self.verify_ssl = verify_ssl

        # Setup headers
        self.headers = headers or {}

        # Add authentication headers if provided
        if api_key:
            self.headers['X-API-Key'] = api_key
        if auth_token:
            print(f"Adding auth token: {auth_token}")
            self.headers['Authorization'] = f'Bearer {auth_token}'
        if session_id:
            print(f"Adding session id: {session_id}")
            self.headers['X-Amzn-Bedrock-AgentCore-Runtime-Session-Id'] = session_id

        # Set content type for SSE
        self.headers['Accept'] = 'application/json'
        self.headers['Cache-Control'] = 'no-cache'

        self.parser = StreamEventParser()

    def invoke_agent_stream(
        self,
        prompt: str,
        session_id: Optional[str] = None,
        additional_params: Optional[Dict[str, Any]] = None,
    ) -> Generator[StreamEvent, None, None]:
        """
        Invoke the AgentCore agent via HTTP with SSE streaming response

        Args:
            prompt: The user prompt to send to the agent
            session_id: Optional session ID for conversation continuity
            additional_params: Optional additional parameters to send in the request

        Yields:
            StreamEvent objects from the SSE stream
        """
        try:
            # Prepare request payload
            payload = {
                'prompt': prompt,
                'stream': True,  # Request streaming response
            }

            if session_id:
                payload['session_id'] = session_id

            if self.agent_id:
                payload['agent_id'] = self.agent_id

            if additional_params:
                payload.update(additional_params)

            # Make the HTTP request with streaming
            response = requests.post(
                self.endpoint_url,
                json=payload,
                headers=self.headers,
                stream=True,  # Enable streaming response
                timeout=self.timeout,
                verify=self.verify_ssl
            )

            # Check for HTTP errors
            response.raise_for_status()

            # Process the SSE stream
            for event in self._process_sse_stream(response):
                yield event

        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP request error: {e}")
            yield StreamEvent(
                type=EventType.ERROR,
                data={'error': str(e), 'error_type': 'http_error'},
                raw_event=None
            )
        except Exception as e:
            logger.error(f"Error processing stream: {e}")
            yield StreamEvent(
                type=EventType.ERROR,
                data={'error': str(e), 'error_type': 'processing_error'},
                raw_event=None
            )
        finally:
            # Ensure the response is properly closed
            if 'response' in locals():
                response.close()

    def _process_sse_stream(self, response: requests.Response) -> Generator[StreamEvent, None, None]:
        """
        Process an SSE stream from the HTTP response

        Args:
            response: The requests Response object with streaming enabled

        Yields:
            StreamEvent objects parsed from the SSE stream
        """
        # Iterate over the response stream line by line
        for line in response.iter_lines(decode_unicode=True):
            if not line:
                continue

            # SSE format: lines start with "data: "
            if line.startswith('data: '):
                data = line[6:]  # Strip "data: " prefix

                # Parse the JSON line
                event = self.parser.parse_json_line(data)
                if event:
                    yield event

    def invoke_with_callback(
        self,
        prompt: str,
        on_content: Optional[Callable[[str], None]] = None,
        on_thinking: Optional[Callable[[str], None]] = None,
        on_tool_use: Optional[Callable[[Dict], None]] = None,
        on_error: Optional[Callable[[Dict], None]] = None,
        **kwargs
    ) -> Optional[Dict[str, Any]]:
        """
        Invoke agent with callbacks for different event types

        Args:
            prompt: The user prompt
            on_content: Callback for content text
            on_thinking: Callback for thinking text
            on_tool_use: Callback for tool use
            on_error: Callback for errors
            **kwargs: Additional arguments for invoke_agent_stream

        Returns:
            The complete assembled message
        """
        assembler = MessageAssembler()

        for event in self.invoke_agent_stream(prompt, **kwargs):
            # Call appropriate callbacks based on event type
            if event.type == EventType.CONTENT_BLOCK_DELTA and on_content:
                text = event.get_text()
                if text:
                    on_content(text)

            elif event.type == EventType.THINKING_DELTA and on_thinking:
                text = event.get_text()
                if text:
                    on_thinking(text)

            elif event.type == EventType.TOOL_USE_STOP and on_tool_use:
                on_tool_use(event.data)

            elif event.type == EventType.ERROR and on_error:
                on_error(event.data)

            # Assemble the complete message
            message = assembler.process_event(event)
            if message:
                return message

        return None

    def test_connection(self) -> bool:
        """
        Test the connection to the AgentCore endpoint

        Returns:
            True if connection is successful, False otherwise
        """
        try:
            # Try a simple GET request to check if endpoint is reachable
            response = requests.get(
                self.endpoint_url,
                headers={'Accept': 'application/json'},
                timeout=5,
                verify=self.verify_ssl
            )
            return response.status_code < 500
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False


class AsyncBedrockAgentCoreStreamClient:
    """Async client for consuming AWS Bedrock AgentCore streaming responses via HTTP/SSE"""

    def __init__(
        self,
        endpoint_url: str,
        agent_id: Optional[str] = None,
        api_key: Optional[str] = None,
        auth_token: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: int = 30,
        verify_ssl: bool = True,
    ):
        """
        Initialize the async Bedrock AgentCore streaming client

        Args:
            endpoint_url: The HTTP endpoint URL for the AgentCore agent
            agent_id: Optional agent ID if not included in endpoint
            api_key: Optional API key for authentication
            auth_token: Optional bearer token for authentication
            headers: Optional custom headers to include in requests
            timeout: Request timeout in seconds
            verify_ssl: Whether to verify SSL certificates
        """
        self.endpoint_url = endpoint_url.rstrip('/')
        self.agent_id = agent_id
        self.timeout = timeout
        self.verify_ssl = verify_ssl

        # Setup headers
        self.headers = headers or {}

        # Add authentication headers if provided
        if api_key:
            self.headers['X-API-Key'] = api_key
        if auth_token:
            self.headers['Authorization'] = f'Bearer {auth_token}'

        # Set content type for SSE
        self.headers['Accept'] = 'text/event-stream'
        self.headers['Cache-Control'] = 'no-cache'

        self.parser = StreamEventParser()

    async def invoke_agent_stream(
        self,
        prompt: str,
        session_id: Optional[str] = None,
        additional_params: Optional[Dict[str, Any]] = None,
    ):
        """
        Invoke the AgentCore agent via HTTP with SSE streaming response (async version)

        Args:
            prompt: The user prompt to send to the agent
            session_id: Optional session ID for conversation continuity
            additional_params: Optional additional parameters to send in the request

        Yields:
            StreamEvent objects from the SSE stream
        """
        import aiohttp

        # Prepare request payload
        payload = {
            'prompt': prompt,
            'stream': True,
        }

        if session_id:
            payload['session_id'] = session_id

        if self.agent_id:
            payload['agent_id'] = self.agent_id

        if additional_params:
            payload.update(additional_params)

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.endpoint_url,
                    json=payload,
                    headers=self.headers,
                    timeout=aiohttp.ClientTimeout(total=self.timeout),
                    ssl=self.verify_ssl
                ) as response:
                    response.raise_for_status()

                    # Process SSE stream line by line
                    async for line in response.content:
                        line_text = line.decode('utf-8').strip()

                        if not line_text:
                            continue

                        # SSE format: lines start with "data: "
                        if line_text.startswith('data: '):
                            data = line_text[6:]  # Strip "data: " prefix

                            # Parse the JSON line
                            event = self.parser.parse_json_line(data)
                            if event:
                                yield event

        except aiohttp.ClientError as e:
            logger.error(f"Async HTTP request error: {e}")
            yield StreamEvent(
                type=EventType.ERROR,
                data={'error': str(e), 'error_type': 'http_error'},
                raw_event=None
            )
        except Exception as e:
            logger.error(f"Error processing async stream: {e}")
            yield StreamEvent(
                type=EventType.ERROR,
                data={'error': str(e), 'error_type': 'processing_error'},
                raw_event=None
            )