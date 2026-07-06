import json
import re
from dataclasses import dataclass

from openai import OpenAI
from pydantic import BaseModel, ValidationError

from app.core.config import get_settings
from app.models.material import Material
from app.schemas.copilot import CopilotHistoryMessage, CopilotSource


STOPWORDS = {
    "about",
    "after",
    "against",
    "because",
    "before",
    "between",
    "could",
    "does",
    "from",
    "have",
    "into",
    "just",
    "more",
    "must",
    "such",
    "than",
    "that",
    "their",
    "them",
    "they",
    "this",
    "what",
    "when",
    "where",
    "which",
    "while",
    "with",
    "would",
}


class CopilotError(Exception):
    pass


class _CopilotModelResponse(BaseModel):
    answer: str
    source_ids: list[str] = []
    suggested_questions: list[str] = []


@dataclass
class _ContextChunk:
    context_id: str
    filename: str
    topic: str
    source_hint: str
    excerpt: str
    token_set: set[str]


class CopilotService:
    def __init__(self) -> None:
        settings = get_settings()
        self.model = settings.openai_model
        self.key = settings.resolved_openai_api_key
        self.client = OpenAI(api_key=self.key) if self.key else None

    @staticmethod
    def _tokenize(text: str) -> set[str]:
        tokens = set(re.findall(r"[a-z0-9']+", text.lower()))
        return {token for token in tokens if len(token) > 2 and token not in STOPWORDS}

    @staticmethod
    def _chunk_text(text: str, chunk_size: int = 950, overlap: int = 180) -> list[str]:
        compact = " ".join(text.split())
        if not compact:
            return []

        chunks: list[str] = []
        start = 0
        while start < len(compact):
            end = min(start + chunk_size, len(compact))
            chunks.append(compact[start:end].strip())
            if end == len(compact):
                break
            start = max(end - overlap, start + 1)
        return chunks

    def _build_chunks(self, materials: list[Material]) -> list[_ContextChunk]:
        chunks: list[_ContextChunk] = []
        for material in materials:
            for index, excerpt in enumerate(self._chunk_text(material.extracted_text)):
                if not excerpt:
                    continue
                context_id = f"CTX-{material.id[:6]}-{index + 1}"
                chunks.append(
                    _ContextChunk(
                        context_id=context_id,
                        filename=material.filename,
                        topic=material.topic,
                        source_hint=f"{material.filename} — excerpt {index + 1}",
                        excerpt=excerpt,
                        token_set=self._tokenize(excerpt),
                    )
                )
        return chunks

    def retrieve_context(self, question: str, materials: list[Material], top_k: int = 8) -> list[CopilotSource]:
        query_tokens = self._tokenize(question)
        all_chunks = self._build_chunks(materials)
        if not all_chunks:
            return []

        scored: list[tuple[int, _ContextChunk]] = []
        for chunk in all_chunks:
            overlap = len(query_tokens & chunk.token_set)
            if overlap == 0:
                continue
            scored.append((overlap, chunk))

        if not scored:
            return []

        scored.sort(key=lambda item: item[0], reverse=True)
        selected = [chunk for _, chunk in scored[:top_k]]
        return [
            CopilotSource(
                context_id=chunk.context_id,
                filename=chunk.filename,
                topic=chunk.topic,
                source_hint=chunk.source_hint,
                excerpt=chunk.excerpt,
            )
            for chunk in selected
        ]

    @staticmethod
    def default_suggestions(materials: list[Material]) -> list[str]:
        topics = sorted({material.topic for material in materials})
        generic = [
            "Give me the high-yield MBE traps I should memorize.",
            "Quiz me on key exceptions with short hypotheticals.",
            "What timing rules are easy to miss?",
            "Give me compare-and-contrast rules likely to be tested.",
        ]
        topic_specific = [f"What are the most testable rules in {topic}?" for topic in topics[:4]]
        return [*topic_specific, *generic][:8]

    def ask(
        self,
        question: str,
        history: list[CopilotHistoryMessage],
        contexts: list[CopilotSource],
    ) -> tuple[str, list[CopilotSource], list[str], bool]:
        if not contexts:
            return (
                "I cannot answer that from the uploaded materials. Try asking about a rule or doctrine "
                "that appears in your PDFs.",
                [],
                [],
                False,
            )

        if not self.client:
            raise CopilotError(
                "OPENAI_API_KEY is not configured in runtime environment. "
                "Set OPENAI_API_KEY on the backend service and redeploy."
            )

        context_block = "\n\n".join(
            f"[{source.context_id}] {source.topic} | {source.source_hint}\n{source.excerpt}"
            for source in contexts
        )
        history_block = "\n".join(
            f"{message.role.upper()}: {message.content}" for message in history[-6:]
        )

        prompt = f"""
You are a bar exam study copilot.
Strict rules:
- Use ONLY the provided context excerpts.
- If support is missing, say you cannot answer from uploaded materials.
- Do not provide legal advice.
- Keep answers concise and exam-useful.
- Cite context IDs for statements in source_ids.

Return JSON:
{{
  "answer": "string",
  "source_ids": ["CTX-..."],
  "suggested_questions": ["string", "string"]
}}

Conversation history:
{history_block or "None"}

User question:
{question}

Context excerpts:
{context_block}
""".strip()

        response = self.client.chat.completions.create(
            model=self.model,
            temperature=0.15,
            timeout=70,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You answer bar exam study questions using only supplied excerpts. "
                        "Return strict JSON only."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        )

        raw = response.choices[0].message.content or "{}"
        try:
            parsed = _CopilotModelResponse.model_validate(json.loads(raw))
        except (json.JSONDecodeError, ValidationError) as exc:
            raise CopilotError("Copilot response parsing failed. Please retry.") from exc

        by_id = {source.context_id: source for source in contexts}
        cited_sources = [by_id[source_id] for source_id in parsed.source_ids if source_id in by_id]

        if not cited_sources:
            return (
                "I cannot confidently answer that from the uploaded materials.",
                [],
                parsed.suggested_questions[:5],
                False,
            )

        return (
            parsed.answer.strip(),
            cited_sources,
            parsed.suggested_questions[:5],
            True,
        )
