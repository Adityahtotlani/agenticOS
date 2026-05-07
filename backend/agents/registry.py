from typing import Dict
from agents.runtime import AgentRuntime

# Global registry of active agent runtimes
active_agents: Dict[int, AgentRuntime] = {}


def register_agent(agent_id: int) -> AgentRuntime:
    """Register and return an agent runtime."""
    if agent_id not in active_agents:
        active_agents[agent_id] = AgentRuntime(agent_id)
    return active_agents[agent_id]


def get_agent_runtime(agent_id: int) -> AgentRuntime:
    """Get an agent runtime, or create if it doesn't exist."""
    return register_agent(agent_id)


def unregister_agent(agent_id: int):
    """Unregister an agent runtime."""
    if agent_id in active_agents:
        del active_agents[agent_id]
