import json
from typing import Any
from tools.web_search import web_search
from tools.code_exec import execute_python
from tools.file_ops import read_file, write_file

# Tool definitions for Claude's API
TOOL_SCHEMAS = [
    {
        "name": "web_search",
        "description": "Search the web for information using DuckDuckGo",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query"
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results (default: 5)",
                    "default": 5
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "execute_python",
        "description": "Execute Python code safely (max 10s timeout)",
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "Python code to execute"
                }
            },
            "required": ["code"]
        }
    },
    {
        "name": "read_file",
        "description": "Read a file from the workspace directory",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "File path relative to workspace/"
                }
            },
            "required": ["path"]
        }
    },
    {
        "name": "write_file",
        "description": "Write content to a file in the workspace directory",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "File path relative to workspace/"
                },
                "content": {
                    "type": "string",
                    "description": "File content"
                }
            },
            "required": ["path", "content"]
        }
    }
]

TOOL_FUNCTIONS = {
    "web_search": web_search,
    "execute_python": execute_python,
    "read_file": read_file,
    "write_file": write_file,
}


async def execute_tool(name: str, input_data: Any) -> str:
    """Execute a tool by name with the given input."""
    if name not in TOOL_FUNCTIONS:
        return json.dumps({"error": f"Unknown tool: {name}"})

    tool_fn = TOOL_FUNCTIONS[name]
    try:
        # Handle both dict and parsed input
        if isinstance(input_data, dict):
            result = await tool_fn(**input_data)
        else:
            result = await tool_fn(input_data)
        return result
    except TypeError as e:
        return json.dumps({"error": f"Tool call error: {str(e)}"})
