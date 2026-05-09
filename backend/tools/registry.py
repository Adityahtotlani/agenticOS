import json
from typing import Any, List, Dict, Optional
from tools.web_search import web_search
from tools.code_exec import execute_python
from tools.file_ops import read_file, write_file
from tools.spawn_agent_tool import spawn_child_agent
from tools.search_kb import search_kb, SEARCH_KB_SCHEMA
from tools.ask_user import ASK_USER_SCHEMA, RISKY_TOOLS

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
    },
    {
        "name": "spawn_child_agent",
        "description": "Spawn a child agent to work on a subtask in parallel",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name for the child agent (e.g., 'Research Assistant')"
                },
                "task_title": {
                    "type": "string",
                    "description": "Title of the subtask for the child agent"
                },
                "task_description": {
                    "type": "string",
                    "description": "Detailed description of what the child agent should do"
                },
                "parent_agent_id": {
                    "type": "integer",
                    "description": "ID of the parent agent (your own ID)"
                },
                "parent_task_id": {
                    "type": "integer",
                    "description": "ID of the current task (parent task)"
                }
            },
            "required": ["name", "task_title", "task_description", "parent_agent_id", "parent_task_id"]
        }
    }
]

TOOL_FUNCTIONS = {
    "web_search": web_search,
    "execute_python": execute_python,
    "read_file": read_file,
    "write_file": write_file,
    "spawn_child_agent": spawn_child_agent,
    "search_kb": search_kb,
}


def build_tool_schemas(knowledge_base_id: Optional[int] = None) -> List[Dict]:
    """Build the tool schema list shown to Claude. Adds search_kb iff the agent has a KB."""
    schemas = list(TOOL_SCHEMAS)
    schemas.append(ASK_USER_SCHEMA)
    if knowledge_base_id is not None:
        schemas.append(SEARCH_KB_SCHEMA)
    return schemas


async def execute_tool(name: str, input_data: Any, knowledge_base_id: Optional[int] = None) -> str:
    """Execute a tool by name with the given input."""
    if name not in TOOL_FUNCTIONS:
        return json.dumps({"error": f"Unknown tool: {name}"})

    tool_fn = TOOL_FUNCTIONS[name]
    try:
        if isinstance(input_data, dict):
            kwargs = dict(input_data)
            if name == "search_kb":
                kwargs["kb_id"] = knowledge_base_id
            result = await tool_fn(**kwargs)
        else:
            result = await tool_fn(input_data)
        return result
    except TypeError as e:
        return json.dumps({"error": f"Tool call error: {str(e)}"})
