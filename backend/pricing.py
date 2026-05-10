"""Per-model pricing in USD per 1M tokens.

Cache pricing follows Anthropic's published multipliers:
- Cache write (5-min TTL): 1.25x input rate
- Cache read: 0.1x input rate
"""
from typing import Dict

_MODEL_RATES: Dict[str, Dict[str, float]] = {
    "claude-opus-4-7": {"input": 15.0, "output": 75.0},
    "claude-sonnet-4-6": {"input": 3.0, "output": 15.0},
    "claude-haiku-4-5": {"input": 1.0, "output": 5.0},
}

# Fallback for unknown / future model ids — use Sonnet rates so we don't undercount.
_DEFAULT_RATE = {"input": 3.0, "output": 15.0}

CACHE_WRITE_MULTIPLIER = 1.25
CACHE_READ_MULTIPLIER = 0.10


def _rates_for(model: str) -> Dict[str, float]:
    return _MODEL_RATES.get(model, _DEFAULT_RATE)


def compute_cost(
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_creation_tokens: int = 0,
    cache_read_tokens: int = 0,
) -> float:
    """Return cost in USD for one Anthropic API call."""
    rates = _rates_for(model)
    input_rate = rates["input"] / 1_000_000
    output_rate = rates["output"] / 1_000_000
    cost = (
        input_tokens * input_rate
        + output_tokens * output_rate
        + cache_creation_tokens * input_rate * CACHE_WRITE_MULTIPLIER
        + cache_read_tokens * input_rate * CACHE_READ_MULTIPLIER
    )
    return round(cost, 6)
