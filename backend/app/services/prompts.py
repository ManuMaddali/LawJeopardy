SYSTEM_PROMPT = (
    "You generate bar exam Jeopardy study boards from provided bar prep materials. "
    "The uploaded material is the source of truth. Be accurate to the text. "
    "Do not invent jurisdiction-specific rules unless the provided material states them. "
    "Create useful rule-based questions for bar exam review. Prefer high-yield black-letter rules, "
    "tests, elements, exceptions, and common MBE traps. If the provided material does not support a rule, "
    "do not guess. Return strict valid JSON only. No markdown."
)


def topic_board_prompt(topic: str, filename: str, extracted_text: str) -> str:
    return f"""
Generate one Jeopardy board for the subject: {topic}. Use only the provided extracted text from {filename}.
Create 5 categories with 5 questions each. Questions must get harder as point values increase.
Include concise but exam-useful explanations.

Return strict JSON with this shape:
{{
  "title": "{topic} Board",
  "categories": ["Category 1", "Category 2", "Category 3", "Category 4", "Category 5"],
  "questions": [
    {{
      "category": "Category 1",
      "points": 100,
      "topic": "{topic}",
      "is_random": false,
      "clue": "Question text",
      "answer": "Short answer",
      "explanation": "Bar-exam useful explanation",
      "source_hint": "{filename} — section name",
      "difficulty": "easy|medium|hard"
    }}
  ]
}}

Rules:
- Exactly 25 total questions.
- Exactly 5 questions in each category.
- Use points 100, 200, 300, 400, 500 once per category.
- No duplicate clues in this board.
- Question styles must include rule recall, elements, exceptions, MBE traps, mini hypotheticals, timing rules, distinctions.
- Use content from across the provided excerpts, not just one section.
- Explanations must be exam-usable and include key missing elements or limits where relevant.
- If the excerpt does not clearly support a specific statement, avoid that statement.

Extracted text:
\"\"\"
{extracted_text}
\"\"\"
""".strip()


def mixed_board_prompt(material_snippets: str, board_number: int) -> str:
    return f"""
Generate one mixed Jeopardy board using the provided subject snippets.
Include exactly one category named Random.
Random clues must hide the subject/topic. The answer or explanation may reveal the topic.
Use varied subjects across the board.

Use exactly these 6 categories:
1) MBE Traps
2) Elements
3) Exceptions
4) Timing Rules
5) Distinctions
6) Random

Return strict JSON with this shape:
{{
  "title": "Mixed Board {board_number}",
  "categories": ["MBE Traps", "Elements", "Exceptions", "Timing Rules", "Distinctions", "Random"],
  "questions": [
    {{
      "category": "MBE Traps",
      "points": 100,
      "topic": "Evidence",
      "is_random": false,
      "clue": "Question text",
      "answer": "Short answer",
      "explanation": "Explanation that can include topic details",
      "source_hint": "Evidence.pdf — section name",
      "difficulty": "easy|medium|hard"
    }}
  ]
}}

Rules:
- Exactly 30 total questions.
- Exactly 5 questions in each category.
- Use points 100, 200, 300, 400, 500 once per category.
- No duplicate clues in this board.
- Random category clues must not mention the subject name directly.
- In Random category, the answer or explanation should reveal the subject.
- Distribute questions across different subjects so one subject does not dominate.
- Use only rules supported by the provided snippets.

Subject snippets:
\"\"\"
{material_snippets}
\"\"\"
""".strip()


def json_repair_prompt(broken_output: str) -> str:
    return f"""
Repair the following output into strict valid JSON only.
Do not add new questions unless needed to satisfy formatting.
Do not include markdown, comments, or prose.

Broken output:
\"\"\"
{broken_output}
\"\"\"
""".strip()
