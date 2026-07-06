import json
import logging
import uuid
from collections import defaultdict

from openai import OpenAI
from pydantic import ValidationError

from app.core.config import get_settings
from app.models.material import Material
from app.schemas.generation import AIBoard, AIQuestion
from app.services.prompts import (
    SYSTEM_PROMPT,
    json_repair_prompt,
    mixed_board_prompt,
    topic_board_prompt,
)
from app.services.topic_mapping import FILENAME_TO_TOPIC


logger = logging.getLogger(__name__)

POINT_VALUES = [100, 200, 300, 400, 500]
MIXED_CATEGORIES = ["MBE Traps", "Elements", "Exceptions", "Timing Rules", "Distinctions", "Random"]
TOPIC_SOURCE_LIMIT_CHARS = 24_000
MIXED_MATERIAL_LIMIT_CHARS = 12_000
MIXED_SNIPPET_LENGTH_CHARS = 900
OPENAI_TIMEOUT_SECONDS = 90
TOPIC_TOKENS = sorted(
    {
        topic.lower()
        for topic in FILENAME_TO_TOPIC.values()
    }
    | {
        "torts",
        "real property",
        "evidence",
        "criminal law",
        "criminal procedure",
        "contracts",
        "sales",
        "constitutional law",
        "civil procedure",
    }
)


class BoardGenerationError(Exception):
    pass


class BoardGenerationService:
    def __init__(self) -> None:
        settings = get_settings()
        resolved_key = settings.resolved_openai_api_key
        if not resolved_key:
            raise BoardGenerationError(
                "OPENAI_API_KEY is not configured in runtime environment. "
                "Set OPENAI_API_KEY on the backend service and redeploy."
            )
        self.model = settings.openai_model
        self.client = OpenAI(api_key=resolved_key)

    def generate_topic_board(self, material: Material) -> dict:
        prompt = topic_board_prompt(
            topic=material.topic,
            filename=material.filename,
            extracted_text=self._truncate_for_prompt(
                material.extracted_text, TOPIC_SOURCE_LIMIT_CHARS
            ),
        )
        ai_board = self._request_valid_board(prompt)
        normalized = self._normalize_board(
            ai_board=ai_board,
            fallback_topic=material.topic,
            fallback_title=f"{material.topic} Board",
            required_categories=None,
        )
        normalized["primary_topic"] = material.topic
        return normalized

    def generate_mixed_board(self, materials: list[Material], board_number: int) -> dict:
        prompt = mixed_board_prompt(
            material_snippets=self._build_mixed_snippets(materials),
            board_number=board_number,
        )
        ai_board = self._request_valid_board(prompt)
        normalized = self._normalize_board(
            ai_board=ai_board,
            fallback_topic="Mixed",
            fallback_title=f"Mixed Board {board_number}",
            required_categories=MIXED_CATEGORIES,
        )
        normalized["primary_topic"] = None
        return normalized

    def _request_valid_board(self, user_prompt: str) -> AIBoard:
        first_output = self._chat_json(user_prompt)
        try:
            return self._parse_board(first_output)
        except (json.JSONDecodeError, ValidationError) as first_error:
            logger.warning("Initial AI board parse failed: %s", first_error)
            repaired_output = self._chat_json(json_repair_prompt(first_output))
            try:
                return self._parse_board(repaired_output)
            except (json.JSONDecodeError, ValidationError) as second_error:
                logger.exception("JSON repair failed: %s", second_error)
                raise BoardGenerationError(
                    "AI returned invalid JSON twice. Please retry board generation."
                ) from second_error

    def _chat_json(self, user_prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            temperature=0.3,
            timeout=OPENAI_TIMEOUT_SECONDS,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content or "{}"

    @staticmethod
    def _parse_board(raw_output: str) -> AIBoard:
        payload = json.loads(raw_output)
        return AIBoard.model_validate(payload)

    def _normalize_board(
        self,
        ai_board: AIBoard,
        fallback_topic: str,
        fallback_title: str,
        required_categories: list[str] | None,
    ) -> dict:
        categories = required_categories or ai_board.categories
        if required_categories is None and len(categories) != 5:
            raise BoardGenerationError("Topic board must contain exactly 5 categories.")
        if required_categories is not None and len(categories) != 6:
            raise BoardGenerationError("Mixed board must contain exactly 6 categories.")

        grouped: dict[str, list[AIQuestion]] = defaultdict(list)
        category_index = {name.lower(): name for name in categories}
        for question in ai_board.questions:
            key = question.category.strip().lower()
            if key in category_index:
                grouped[category_index[key]].append(question)

        normalized_questions: list[dict] = []
        used_clues: set[str] = set()

        for category in categories:
            candidates = sorted(grouped.get(category, []), key=lambda q: q.points)
            if len(candidates) < 5:
                raise BoardGenerationError(
                    f"Category '{category}' has {len(candidates)} questions, expected 5."
                )

            selected: list[AIQuestion] = []
            for candidate in candidates:
                clue_key = candidate.clue.strip().lower()
                if clue_key in used_clues:
                    continue
                selected.append(candidate)
                used_clues.add(clue_key)
                if len(selected) == 5:
                    break

            if len(selected) < 5:
                raise BoardGenerationError(
                    f"Category '{category}' has duplicate clues; unable to keep 5 unique clues."
                )

            for idx, question in enumerate(selected):
                points = POINT_VALUES[idx]
                topic = (question.topic or fallback_topic).strip()
                clue = question.clue.strip()
                if category == "Random":
                    clue = self._sanitize_random_clue(clue)

                normalized_questions.append(
                    {
                        "id": str(uuid.uuid4()),
                        "category": category,
                        "points": points,
                        "topic": topic,
                        "is_random": category == "Random" or question.is_random,
                        "clue": clue,
                        "answer": question.answer.strip(),
                        "explanation": question.explanation.strip(),
                        "source_hint": question.source_hint.strip()
                        or f"{topic} source material",
                        "difficulty": self._normalize_difficulty(question.difficulty, points),
                    }
                )

        return {
            "title": ai_board.title.strip() or fallback_title,
            "categories": categories,
            "questions": normalized_questions,
            "topics": sorted({q["topic"] for q in normalized_questions}),
        }

    @staticmethod
    def _truncate_for_prompt(text: str, limit: int) -> str:
        compact = " ".join(text.split())
        return compact[:limit]

    def _build_mixed_snippets(self, materials: list[Material]) -> str:
        snippets: list[str] = []
        for material in materials:
            compact = self._truncate_for_prompt(
                material.extracted_text, MIXED_MATERIAL_LIMIT_CHARS
            )
            if not compact:
                continue
            block = max(len(compact) // 3, 1)
            starts = [0, block, block * 2]
            for index, start in enumerate(starts):
                piece = compact[start : start + MIXED_SNIPPET_LENGTH_CHARS].strip()
                if piece:
                    snippets.append(
                        f"[{material.topic} | {material.filename} | excerpt {index + 1}] {piece}"
                    )
        return "\n\n".join(snippets)

    @staticmethod
    def _normalize_difficulty(raw_difficulty: str | None, points: int) -> str:
        if raw_difficulty in {"easy", "medium", "hard"}:
            return raw_difficulty
        if points <= 200:
            return "easy"
        if points == 300:
            return "medium"
        return "hard"

    @staticmethod
    def _sanitize_random_clue(clue: str) -> str:
        lower = clue.lower()
        sanitized = clue
        for token in TOPIC_TOKENS:
            if token in lower:
                sanitized = sanitized.replace(token, "this subject")
                sanitized = sanitized.replace(token.title(), "this subject")
        return sanitized
