import re
import numpy as np


def log_to_features(log_text: str):
    text = (log_text or "").lower()
    original = log_text or ""
    length = len(text)
    error_count = text.count("error") + text.count("exception") + text.count("failed")
    warn_count = text.count("warn")
    timeout_count = text.count("timeout") + text.count("latency")
    restart_count = text.count("restart") + text.count("crash")
    upper_ratio = (sum(1 for c in original if c.isupper()) / max(len(original), 1))
    numbers = [int(x) for x in re.findall(r"\d+", text)]
    max_number = max(numbers) if numbers else 0
    avg_number = sum(numbers) / len(numbers) if numbers else 0

    return np.array(
        [
            length,
            error_count,
            warn_count,
            timeout_count,
            restart_count,
            upper_ratio,
            max_number,
            avg_number,
        ],
        dtype=float,
    )
