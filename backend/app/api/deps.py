import re

from fastapi import Header, Request


OWNER_KEY_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{8,64}$")


def get_owner_key(
    request: Request,
    x_visitor_id: str | None = Header(default=None),
) -> str:
    candidate = x_visitor_id or request.query_params.get("visitor_id")
    if candidate and OWNER_KEY_PATTERN.match(candidate):
        return candidate
    return "anonymous"
