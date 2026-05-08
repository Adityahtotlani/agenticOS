import json
from typing import List
from anthropic import Anthropic
from config import settings


async def decompose_task(task_title: str, task_description: str) -> List[dict]:
    """
    Use Claude Haiku to decompose a task into subtasks.
    Returns a list of subtask dicts with: title, description, agent_name
    """
    client = Anthropic(api_key=settings.anthropic_api_key)

    prompt = f"""You are a task planner. Given a complex task, decompose it into 2-5 independent subtasks that can be done in parallel.

Task: {task_title}
Description: {task_description}

Return a JSON array of subtasks. Each subtask must have:
- title: short name (5-10 words)
- description: detailed description (1-2 sentences)
- agent_name: suggested agent name for this subtask (e.g., "Research Agent", "Code Agent")

Example output:
[
  {{"title": "Search for recent papers", "description": "Find and summarize 3 recent academic papers on this topic.", "agent_name": "Research Agent"}},
  {{"title": "Analyze industry trends", "description": "Identify 3 key industry trends related to this topic.", "agent_name": "Analysis Agent"}},
  {{"title": "Compile findings", "description": "Combine all findings into a cohesive summary.", "agent_name": "Synthesis Agent"}}
]

Return ONLY the JSON array, no other text."""

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=1000,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    try:
        text = response.content[0].text
        # Try to parse JSON from the response
        subtasks = json.loads(text)
        return subtasks[:5]  # Limit to 5 subtasks
    except (json.JSONDecodeError, IndexError, AttributeError):
        return []  # Return empty list if parsing fails
