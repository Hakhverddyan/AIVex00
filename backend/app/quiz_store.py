from __future__ import annotations

import json
import os
import secrets
from typing import Dict, Optional

from .config import Settings
from .schemas import QuizPayload, StudentQuizPayload, StudentQuizQuestion

_mem: Dict[str, QuizPayload] = {}

def _code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(8))

def ensure_data_dir(settings: Settings) -> None:
    os.makedirs(settings.data_dir, exist_ok=True)

def save_quiz(settings: Settings, quiz: QuizPayload) -> None:
    ensure_data_dir(settings)
    path = os.path.join(settings.data_dir, f"{quiz.quiz_code}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(quiz.model_dump(), f, ensure_ascii=False, indent=2)
    _mem[quiz.quiz_code] = quiz

def load_quiz(settings: Settings, code: str) -> Optional[QuizPayload]:
    if code in _mem:
        return _mem[code]
    path = os.path.join(settings.data_dir, f"{code}.json")
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    quiz = QuizPayload(**data)
    _mem[code] = quiz
    return quiz

def new_quiz_code(settings: Settings) -> str:
    ensure_data_dir(settings)
    for _ in range(20):
        c = _code()
        if not os.path.exists(os.path.join(settings.data_dir, f"{c}.json")):
            return c
    return _code()

def to_student_payload(quiz: QuizPayload) -> StudentQuizPayload:
    return StudentQuizPayload(
        quiz_code=quiz.quiz_code,
        topic=quiz.topic,
        language=quiz.language,
        difficulty=quiz.difficulty,
        created_at=quiz.created_at,
        questions=[StudentQuizQuestion(id=q.id, question=q.question, options=q.options) for q in quiz.questions],
    )
