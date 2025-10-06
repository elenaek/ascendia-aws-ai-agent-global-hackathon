"""
Parser for Bedrock AgentCore streaming events
"""

import json
from typing import Optional, Generator, Union
from time import time
from .types import StreamEvent, EventType


class StreamEventParser:
    """Parser for JSON-LD (JSON Lines Delimited) stream from Bedrock AgentCore"""

    def __init__(self):
        self.buffer = ""
        self.in_reasoning_block = False

    def parse_json_line(self, line: str) -> Optional[StreamEvent]:
        """Parse a single JSON line into a StreamEvent object"""
        if not line.strip():
            return None

        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            # If it's not valid JSON (e.g., Python repr debug lines), skip it
            return None
        except Exception:
            # Handle any other parsing errors gracefully
            return None

        # Skip if data is a string (debug/repr output that was JSON-encoded)
        if isinstance(data, str):
            return None

        # Handle different types of JSON objects
        if "event" in data:
            # This is a streaming event
            event_data = data["event"]

            # Determine event type based on the key in the event object
            if "messageStart" in event_data:
                return StreamEvent(
                    type=EventType.MESSAGE_START,
                    data=event_data["messageStart"],
                    raw_event=line,
                    timestamp=time()
                )
            elif "contentBlockDelta" in event_data:
                delta_data = event_data["contentBlockDelta"]
                delta_inner = delta_data.get("delta", {})

                # Check for reasoning content (thinking)
                if "reasoningContent" in delta_inner:
                    reasoning_data = delta_inner["reasoningContent"]
                    return StreamEvent(
                        type=EventType.THINKING_DELTA,
                        data={"delta": {"text": reasoning_data.get("text", "")}},
                        raw_event=line,
                        timestamp=time()
                    )
                # Check if this is a tool use delta
                elif "toolUse" in delta_inner:
                    tool_use_data = delta_inner["toolUse"]
                    return StreamEvent(
                        type=EventType.TOOL_USE_DELTA,
                        data={
                            "delta": {"input": tool_use_data.get("input", "")}
                        },
                        raw_event=line,
                        timestamp=time()
                    )
                # Regular text content
                else:
                    return StreamEvent(
                        type=EventType.CONTENT_BLOCK_DELTA,
                        data=delta_data,
                        raw_event=line,
                        timestamp=time()
                    )
            elif "contentBlockStart" in event_data:
                block_data = event_data["contentBlockStart"]
                start_data = block_data.get("start", {})

                # Check for reasoning content block (thinking)
                if "reasoningContent" in start_data:
                    self.in_reasoning_block = True
                    return StreamEvent(
                        type=EventType.THINKING_START,
                        data={},
                        raw_event=line,
                        timestamp=time()
                    )
                # Check if this is a tool use block
                elif "toolUse" in start_data:
                    tool_use = start_data["toolUse"]
                    return StreamEvent(
                        type=EventType.TOOL_USE_START,
                        data={
                            "id": tool_use.get("toolUseId"),
                            "name": tool_use.get("name")
                        },
                        raw_event=line,
                        timestamp=time()
                    )
                # Regular text content block
                else:
                    return StreamEvent(
                        type=EventType.CONTENT_BLOCK_START,
                        data=block_data,
                        raw_event=line,
                        timestamp=time()
                    )
            elif "contentBlockStop" in event_data:
                stop_data = event_data["contentBlockStop"]

                # Check if we're ending a reasoning block
                if self.in_reasoning_block:
                    self.in_reasoning_block = False
                    return StreamEvent(
                        type=EventType.THINKING_STOP,
                        data={},
                        raw_event=line,
                        timestamp=time()
                    )
                # Regular content block stop
                else:
                    return StreamEvent(
                        type=EventType.CONTENT_BLOCK_STOP,
                        data=stop_data,
                        raw_event=line,
                        timestamp=time()
                    )
            elif "messageStop" in event_data:
                return StreamEvent(
                    type=EventType.MESSAGE_STOP,
                    data=event_data["messageStop"],
                    raw_event=line,
                    timestamp=time()
                )
            elif "metadata" in event_data:
                # Metadata event with usage and metrics
                return StreamEvent(
                    type=EventType.UNKNOWN,
                    data=event_data["metadata"],
                    raw_event=line,
                    timestamp=time()
                )
            else:
                # Unknown event type
                return StreamEvent(
                    type=EventType.UNKNOWN,
                    data=event_data,
                    raw_event=line,
                    timestamp=time()
                )

        elif "message" in data:
            # Final message object (summary, not another stop event)
            # Treat as unknown to avoid duplicate MESSAGE_STOP displays
            return StreamEvent(
                type=EventType.UNKNOWN,
                data=data["message"],
                raw_event=line,
                timestamp=time()
            )

        elif "result" in data:
            # Final result object (AgentCore specific)
            return StreamEvent(
                type=EventType.UNKNOWN,
                data=data,
                raw_event=line,
                timestamp=time()
            )

        elif "init_event_loop" in data or "start" in data or "start_event_loop" in data:
            # Initialization events
            return StreamEvent(
                type=EventType.UNKNOWN,
                data=data,
                raw_event=line,
                timestamp=time()
            )

        elif "data" in data:
            # Debug/trace data from the agent
            return StreamEvent(
                type=EventType.UNKNOWN,
                data=data,
                raw_event=line,
                timestamp=time()
            )

        return None

    def parse_stream(self, stream: Union[Generator, bytes, str]) -> Generator[StreamEvent, None, None]:
        """
        Parse a stream of JSON-LD data into StreamEvent objects

        Args:
            stream: Can be a generator yielding chunks, bytes, or string

        Yields:
            StreamEvent objects parsed from the stream
        """
        if isinstance(stream, (bytes, str)):
            # Handle static content
            if isinstance(stream, bytes):
                stream = stream.decode('utf-8')

            # Split by newlines for JSON-LD format
            lines = stream.split('\n')

            for line in lines:
                event = self.parse_json_line(line)
                if event:
                    yield event
        else:
            # Handle streaming content
            for chunk in stream:
                if isinstance(chunk, bytes):
                    chunk = chunk.decode('utf-8')

                self.buffer += chunk
                lines = self.buffer.split('\n')

                # Keep the last incomplete line in the buffer
                if not self.buffer.endswith('\n'):
                    self.buffer = lines[-1]
                    lines = lines[:-1]
                else:
                    self.buffer = ""

                for line in lines:
                    event = self.parse_json_line(line)
                    if event:
                        yield event



class MessageAssembler:
    """Assembles complete messages from stream events"""

    def __init__(self):
        self.current_message = None
        self.current_content = None
        self.current_block_type = None  # Track if current block is 'text' or 'tool_use'
        self.thinking_buffer = []
        self.content_buffer = []
        self.tool_buffer = {}

    def process_event(self, event: StreamEvent):
        """Process a stream event and update internal state"""

        

        if event.type == EventType.MESSAGE_START:
            # Initialize new message
            self.current_message = {
                "role": event.data.get("role", "assistant"),
                "content": [],
                "thinking": None,
                "model": event.data.get("model"),
                "usage": None
            }
            self.thinking_buffer = []
            self.content_buffer = []

        elif event.type == EventType.THINKING_DELTA:
            # Accumulate thinking text
            text = event.data.get("delta", {}).get("text", "")
            self.thinking_buffer.append(text)

        elif event.type == EventType.THINKING_STOP:
            # Finalize thinking
            if self.current_message and self.thinking_buffer:
                self.current_message["thinking"] = "".join(self.thinking_buffer)

        elif event.type == EventType.CONTENT_BLOCK_START:
            # Initialize new content block
            self.current_block_type = "text"
            self.current_content = {
                "type": "text",
                "text": ""
            }

        elif event.type == EventType.CONTENT_BLOCK_DELTA:
            # Accumulate content text
            if self.current_content:
                text = event.data.get("delta", {}).get("text", "")
                if self.current_content["type"] == "text":
                    self.current_content["text"] += text

        elif event.type == EventType.CONTENT_BLOCK_STOP:
            # Finalize content block - check what type it was
            if self.current_block_type == "tool_use" and hasattr(self, 'current_tool_id'):
                # This was a tool use block, finalize it
                tool_id = self.current_tool_id
                if tool_id in self.tool_buffer and self.current_message:
                    tool_data = self.tool_buffer[tool_id]
                    try:
                        if tool_data["input"]:
                            tool_data["input"] = json.loads(tool_data["input"])
                    except json.JSONDecodeError:
                        pass  # Keep as string if not valid JSON
                    self.current_message["content"].append(tool_data)
                    del self.tool_buffer[tool_id]
                delattr(self, 'current_tool_id')
            elif self.current_message and self.current_content:
                # Regular text content block
                self.current_message["content"].append(self.current_content)

            self.current_content = None
            self.current_block_type = None

        elif event.type == EventType.TOOL_USE_START:
            # Initialize tool use
            self.current_block_type = "tool_use"
            tool_id = event.data.get("id")
            self.tool_buffer[tool_id] = {
                "type": "tool_use",
                "id": tool_id,
                "name": event.data.get("name"),
                "input": ""
            }
            # Store reference to current tool
            self.current_tool_id = tool_id

        elif event.type == EventType.TOOL_USE_DELTA:
            # Accumulate tool input - use current_tool_id since deltas don't include id
            if hasattr(self, 'current_tool_id') and self.current_tool_id in self.tool_buffer:
                delta_input = event.data.get("delta", {}).get("input", "")
                self.tool_buffer[self.current_tool_id]["input"] += delta_input

        elif event.type == EventType.TOOL_USE_STOP:
            # Finalize tool use - use current_tool_id since stop events don't have id
            if hasattr(self, 'current_tool_id'):
                tool_id = self.current_tool_id
                if tool_id in self.tool_buffer and self.current_message:
                    tool_data = self.tool_buffer[tool_id]
                    try:
                        if tool_data["input"]:
                            tool_data["input"] = json.loads(tool_data["input"])
                    except json.JSONDecodeError:
                        pass  # Keep as string if not valid JSON
                    self.current_message["content"].append(tool_data)
                    del self.tool_buffer[tool_id]
                # Clear the current_tool_id
                delattr(self, 'current_tool_id')

        elif event.type == EventType.MESSAGE_STOP:
            # Finalize message
            if self.current_message:
                self.current_message["usage"] = event.data.get("usage")
                self.current_message["stop_reason"] = event.data.get("stop_reason")
                return self.current_message

        return None