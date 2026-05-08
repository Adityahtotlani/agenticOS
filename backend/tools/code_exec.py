import subprocess
import sys
import json


async def execute_python(code: str) -> str:
    """Execute Python code safely with timeout."""
    try:
        result = subprocess.run(
            [sys.executable, "-c", code],
            capture_output=True,
            text=True,
            timeout=10
        )

        output = result.stdout or result.stderr
        return json.dumps({
            "success": result.returncode == 0,
            "output": output[:2000]  # Limit output
        })
    except subprocess.TimeoutExpired:
        return json.dumps({"error": "Code execution timed out (>10s)"})
    except Exception as e:
        return json.dumps({"error": str(e)})
