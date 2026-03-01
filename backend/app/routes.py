from __future__ import annotations

import datetime
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import PlainTextResponse

from .config import get_settings
from .schemas import GenerateRequest, QuizPayload, SubmitRequest, SubmitResponse, PerQuestionResult
from .gemini_client import generate_questions
from .quiz_store import new_quiz_code, save_quiz, load_quiz, to_student_payload

router = APIRouter()

def _require_teacher(x_teacher_password: str | None) -> None:
    settings = get_settings()
    if (x_teacher_password or "") != settings.teacher_password:
        raise HTTPException(status_code=401, detail="Teacher password incorrect")

@router.get("/health")
def health():
    return {"status": "ok"}

@router.post("/teacher/generate", response_model=QuizPayload)
def teacher_generate(req: GenerateRequest, x_teacher_password: str | None = Header(default=None)):
    _require_teacher(x_teacher_password)
    settings = get_settings()
    code = new_quiz_code(settings)
    try:
        questions = generate_questions(settings, req)
    except Exception as e:
        # Convert to clean JSON error for the frontend.
        raise HTTPException(status_code=400, detail=str(e))
    quiz = QuizPayload(
        quiz_code=code,
        topic=req.topic,
        language=req.language,
        difficulty=req.difficulty,
        created_at=datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z",
        questions=questions,
    )
    save_quiz(settings, quiz)
    return quiz

@router.get("/student/quiz/{quiz_code}")
def student_get_quiz(quiz_code: str):
    settings = get_settings()
    quiz = load_quiz(settings, quiz_code)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return to_student_payload(quiz)

@router.get("/teacher/quiz/{quiz_code}", response_model=QuizPayload)
def teacher_get_quiz(quiz_code: str, x_teacher_password: str | None = Header(default=None)):
    _require_teacher(x_teacher_password)
    settings = get_settings()
    quiz = load_quiz(settings, quiz_code)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

@router.post("/student/submit", response_model=SubmitResponse)
def student_submit(req: SubmitRequest):
    settings = get_settings()
    quiz = load_quiz(settings, req.quiz_code)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if len(req.answers) != len(quiz.questions):
        raise HTTPException(status_code=400, detail="Answers length does not match quiz length")

    results = []
    score = 0
    for q, chosen in zip(quiz.questions, req.answers):
        is_correct = int(chosen) == int(q.correct_index)
        if is_correct:
            score += 1
        results.append(PerQuestionResult(
            id=q.id,
            chosen_index=int(chosen),
            correct_index=int(q.correct_index),
            is_correct=is_correct,
            explanation=q.explanation
        ))
    total = len(quiz.questions)
    percent = round((score / total) * 100.0, 2) if total else 0.0
    return SubmitResponse(
        quiz_code=req.quiz_code,
        score=score,
        total=total,
        percent=percent,
        results=results
    )

@router.get("/forms/script/{quiz_code}", response_class=PlainTextResponse)
def get_forms_script(quiz_code: str):
    settings = get_settings()
    quiz = load_quiz(settings, quiz_code)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    title = quiz.topic.replace('"', '\"')
    lines = []
    lines.append('function createForm() {')
    lines.append(f'  var form = FormApp.create("{title}");')
    lines.append('  form.setIsQuiz(true);')
    lines.append('  form.setCollectEmail(true);')
    lines.append('  // Student identification')
    lines.append('  var nameItem = form.addTextItem();')
    lines.append('  nameItem.setTitle("Name").setRequired(true);')
    lines.append('  var surnameItem = form.addTextItem();')
    lines.append('  surnameItem.setTitle("Surname").setRequired(true);')
    lines.append('')

    for q in quiz.questions:
        qtxt = q.question.replace('"', '\"')
        lines.append(f'  // Q{q.id}')
        lines.append(f'  var item{q.id} = form.addMultipleChoiceItem();')
        lines.append(f'  item{q.id}.setTitle("{qtxt}");')
        lines.append(f'  var choices{q.id} = [];')
        for idx, opt in enumerate(q.options):
            opt_txt = opt.replace('"', '\"')
            is_corr = 'true' if idx == q.correct_index else 'false'
            lines.append(f'  choices{q.id}.push(item{q.id}.createChoice("{opt_txt}", {is_corr}));')
        lines.append(f'  item{q.id}.setChoices(choices{q.id});')
        lines.append(f'  item{q.id}.setPoints(1);')
        lines.append(f'  item{q.id}.setRequired(true);')
        if q.explanation:
            exp = q.explanation.replace('"', '\"')
            lines.append(f'  item{q.id}.setFeedbackForCorrect(FormApp.createFeedback().setText("{exp}").build());')
        lines.append('')

    lines.append('  Logger.log("Edit URL: " + form.getEditUrl());')
    lines.append('  Logger.log("Public URL: " + form.getPublishedUrl());')
    lines.append('}')
    return "\n".join(lines) + "\n"
