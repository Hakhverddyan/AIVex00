from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field

Language = Literal["hy", "en", "ru"]
Difficulty = Literal["easy", "medium", "hard"]

class GenerateRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=200)
    material: str = Field(min_length=10, max_length=40000)
    language: Language = "en"
    difficulty: Difficulty = "medium"
    num_questions: int = Field(ge=1, le=40)

class QuizQuestion(BaseModel):
    id: int
    question: str
    options: List[str] = Field(min_length=2, max_length=6)
    correct_index: int = Field(ge=0, le=5)
    explanation: Optional[str] = None

class QuizPayload(BaseModel):
    quiz_code: str
    topic: str
    language: Language
    difficulty: Difficulty
    created_at: str
    questions: List[QuizQuestion]

class StudentQuizQuestion(BaseModel):
    id: int
    question: str
    options: List[str]

class StudentQuizPayload(BaseModel):
    quiz_code: str
    topic: str
    language: Language
    difficulty: Difficulty
    created_at: str
    questions: List[StudentQuizQuestion]

class SubmitRequest(BaseModel):
    quiz_code: str
    answers: List[int]  

class PerQuestionResult(BaseModel):
    id: int
    chosen_index: int
    correct_index: int
    is_correct: bool
    explanation: Optional[str] = None

class SubmitResponse(BaseModel):
    quiz_code: str
    score: int
    total: int
    percent: float
    results: List[PerQuestionResult]
