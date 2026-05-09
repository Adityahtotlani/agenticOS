"""Per-task MCP session orchestration.

A single MCPSessionGroup spawns one stdio subprocess per server, holds all
sessions open inside an AsyncExitStack, exposes their combined tool list (with
prefixed names so they don't collide), and routes call_tool back to the right
session.
"""
import json
import logging
from contextlib import AsyncExitStack
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

logger = logging.getLogger(__name__)

TOOL_PREFIX = "mcp_"  # tool names are exposed to Claude as mcp_<server_id>__<tool_name>
TOOL_SEP = "__"


def qualify(server_id: int, tool_name: str) -> str:
    return f"{TOOL_PREFIX}{server_id}{TOOL_SEP}{tool_name}"


def unqualify(qualified: str) -> Optional[Tuple[int, str]]:
    if not qualified.startswith(TOOL_PREFIX):
        return None
    rest = qualified[len(TOOL_PREFIX):]
    if TOOL_SEP not in rest:
        return None
    server_part, tool_name = rest.split(TOOL_SEP, 1)
    try:
        return int(server_part), tool_name
    except ValueError:
        return None


@dataclass
class MCPServerConfig:
    id: int
    name: str
    command: str
    args: List[str]
    env: Dict[str, str]


def _params(cfg: MCPServerConfig) -> StdioServerParameters:
    return StdioServerParameters(command=cfg.command, args=cfg.args or [], env=cfg.env or None)


def _content_to_text(content: Any) -> str:
    """Best-effort flattening of MCP tool result content into a string."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            text = getattr(item, "text", None)
            if text is not None:
                parts.append(text)
            else:
                parts.append(str(item))
        return "\n".join(parts)
    text = getattr(content, "text", None)
    if text is not None:
        return text
    return str(content)


async def list_tools_safe(cfg: MCPServerConfig, timeout: float = 15.0) -> Dict[str, Any]:
    """Connect to a single server, list its tools, then disconnect.

    Used by the /api/mcp-servers/{id}/test endpoint so users can verify
    a config before attaching it to an agent.
    """
    import asyncio

    async def _do() -> Dict[str, Any]:
        async with AsyncExitStack() as stack:
            read, write = await stack.enter_async_context(stdio_client(_params(cfg)))
            session = await stack.enter_async_context(ClientSession(read, write))
            await session.initialize()
            result = await session.list_tools()
            tools = []
            for t in result.tools:
                tools.append({
                    "name": t.name,
                    "description": getattr(t, "description", "") or "",
                    "input_schema": getattr(t, "inputSchema", None) or {},
                })
            return {"ok": True, "tools": tools}

    try:
        return await asyncio.wait_for(_do(), timeout=timeout)
    except asyncio.TimeoutError:
        return {"ok": False, "error": f"timed out after {timeout}s"}
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}


class MCPSessionGroup:
    """Async context manager that holds open sessions to multiple MCP servers.

    Usage:
        async with MCPSessionGroup(configs) as group:
            schemas = group.tool_schemas()  # ready to pass to Claude
            result = await group.call("mcp_3__read_file", {"path": "..."})
    """

    def __init__(self, configs: List[MCPServerConfig]):
        self.configs = configs
        self._stack: Optional[AsyncExitStack] = None
        self._sessions: Dict[int, ClientSession] = {}
        self._tool_index: Dict[str, Tuple[int, str]] = {}  # qualified -> (server_id, original_name)
        self._schemas: List[Dict[str, Any]] = []

    async def __aenter__(self) -> "MCPSessionGroup":
        self._stack = AsyncExitStack()
        await self._stack.__aenter__()
        for cfg in self.configs:
            try:
                read, write = await self._stack.enter_async_context(stdio_client(_params(cfg)))
                session = await self._stack.enter_async_context(ClientSession(read, write))
                await session.initialize()
                self._sessions[cfg.id] = session
                tools_result = await session.list_tools()
                for t in tools_result.tools:
                    qname = qualify(cfg.id, t.name)
                    self._tool_index[qname] = (cfg.id, t.name)
                    self._schemas.append({
                        "name": qname,
                        "description": f"[{cfg.name}] " + (getattr(t, "description", "") or ""),
                        "input_schema": getattr(t, "inputSchema", None) or {"type": "object", "properties": {}},
                    })
            except Exception as e:
                logger.warning("MCP server %s (%s) failed to start: %s", cfg.id, cfg.name, e)
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if self._stack:
            try:
                await self._stack.__aexit__(exc_type, exc, tb)
            except Exception as e:
                logger.warning("MCP session shutdown error: %s", e)
            self._stack = None
        self._sessions.clear()

    def tool_schemas(self) -> List[Dict[str, Any]]:
        return list(self._schemas)

    def has_tool(self, qualified: str) -> bool:
        return qualified in self._tool_index

    async def call(self, qualified: str, arguments: Dict[str, Any]) -> str:
        mapping = self._tool_index.get(qualified)
        if not mapping:
            return json.dumps({"error": f"Unknown MCP tool: {qualified}"})
        server_id, tool_name = mapping
        session = self._sessions.get(server_id)
        if not session:
            return json.dumps({"error": f"MCP server {server_id} not connected"})
        try:
            result = await session.call_tool(name=tool_name, arguments=arguments)
            text = _content_to_text(result.content)
            if getattr(result, "isError", False):
                return json.dumps({"error": text or "tool reported error"})
            return text
        except Exception as e:
            return json.dumps({"error": f"{type(e).__name__}: {e}"})
