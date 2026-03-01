from __future__ import annotations

import json
import re
from typing import List

from google import genai

from .config import Settings
from .schemas import GenerateRequest, QuizQuestion

_SYSTEM = """You are a helpful exam generator.
Return ONLY valid JSON. No markdown. No extra text.

You must output an object:
{
  "questions": [
     {
       "question": "...",
       "options": ["A", "B", "C", "D"],
       "correct_index": 0,
       "explanation": "short"
     }
  ]
}

Rules:
- Create {N} multiple-choice questions based ONLY on the provided topic and material.
- Options: 4 options unless impossible; then 3-6.
- correct_index must be within options range.
- Language must match exactly: Armenian (hy), English (en), or Russian (ru).
- Difficulty: easy/medium/hard adjusts complexity and distractors.
"""

_LANG_MAP = {"hy": "Armenian", "en": "English", "ru": "Russian"}

def _extract_json(text: str) -> str:
    text = (text or "").strip()
    text = re.sub(r"^```(json)?\s*", "", text, flags=re.I)
    text = re.sub(r"\s*```$", "", text)
    m = re.search(r"\{.*\}", text, flags=re.S)
    return m.group(0) if m else text

def generate_questions(settings: Settings, req: GenerateRequest) -> List[QuizQuestion]:
    if not settings.gemini_api_key:
        raise RuntimeError("Missing GEMINI_API_KEY. Create backend/.env from .env.example and paste your key.")
    client = genai.Client(api_key=settings.gemini_api_key)
    lang_name = _LANG_MAP.get(req.language, "English")
    prompt = f"""{_SYSTEM}

Language: {lang_name}
Difficulty: {req.difficulty}
N: {req.num_questions}

TOPIC:
{req.topic}

MATERIAL:
{req.material}
"""
    resp = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
    )
    txt = getattr(resp, "text", "") or ""
    raw = _extract_json(txt)
    data = json.loads(raw)

    questions = data.get("questions", [])
    out: List[QuizQuestion] = []
    for i, q in enumerate(questions, start=1):
        out.append(
            QuizQuestion(
                id=i,
                question=str(q["question"]).strip(),
                options=[str(x).strip() for x in q["options"]],
                correct_index=int(q["correct_index"]),
                explanation=(str(q.get("explanation")).strip() if q.get("explanation") is not None else None),
            )
        )
    if len(out) == 0:
        raise ValueError("Model returned no questions. Try providing more material.")
    return out
