import os
import json
from pathlib import Path

WORKSPACE_DIR = Path("./workspace")
WORKSPACE_DIR.mkdir(exist_ok=True)


def _safe_path(path: str) -> Path:
    """Prevent directory traversal attacks."""
    target = (WORKSPACE_DIR / path).resolve()
    if not str(target).startswith(str(WORKSPACE_DIR.resolve())):
        raise ValueError("Path outside workspace")
    return target


async def read_file(path: str) -> str:
    """Read a file from the workspace."""
    try:
        safe_path = _safe_path(path)
        with open(safe_path, "r") as f:
            content = f.read(10000)  # Limit to 10KB
        return json.dumps({"success": True, "content": content})
    except Exception as e:
        return json.dumps({"error": str(e)})


async def write_file(path: str, content: str) -> str:
    """Write a file to the workspace."""
    try:
        safe_path = _safe_path(path)
        safe_path.parent.mkdir(parents=True, exist_ok=True)
        with open(safe_path, "w") as f:
            f.write(content)
        return json.dumps({"success": True, "message": f"Written to {path}"})
    except Exception as e:
        return json.dumps({"error": str(e)})
