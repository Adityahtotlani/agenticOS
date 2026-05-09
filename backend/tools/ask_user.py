"""ask_user is intercepted by the runtime — there is no executable function."""

ASK_USER_SCHEMA = {
    "name": "ask_user",
    "description": (
        "Ask the user a clarifying question. Use sparingly — only when the answer cannot be "
        "determined from context, prior messages, or available tools. The user will see the "
        "question and respond; their answer is returned as the tool result."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "question": {
                "type": "string",
                "description": "The question to ask the user.",
            },
        },
        "required": ["question"],
    },
}

# Tools that require explicit user approval before they execute.
RISKY_TOOLS = {"write_file", "execute_python"}
