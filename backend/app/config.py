from __future__ import annotations

import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass(frozen=True)
class Settings:
    gemini_api_key: str
    gemini_model: str
    teacher_password: str
    data_dir: str

def get_settings() -> Settings:
    gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
    teacher_password = os.getenv("TEACHER_PASSWORD", "123456").strip() or "123456"
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data", "quizzes")
    data_dir = os.path.abspath(data_dir)
    return Settings(
        gemini_api_key=gemini_api_key,
        gemini_model=gemini_model,
        teacher_password=teacher_password,
        data_dir=data_dir,
    )
