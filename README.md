# Gemini Quiz Builder (Teacher / Student)

## What you get
- Teacher mode (password):
  - Enter topic + source material (only teacher can)
  - Generate MCQ quiz with Gemini
  - Shows answers + explanations
  - Share quiz code or student link
  - Download Google Forms Apps Script (quiz mode with correct answers)
- Student mode:
  - Load quiz by code or teacher link
  - Click answers
  - Submit at the end → score + correct answers + explanations
  - Student cannot see answers before submit

## Setup
1) Extract zip.
2) In `backend/`, copy `.env.example` → `.env`, then paste your key:
   - GEMINI_API_KEY=...
   - TEACHER_PASSWORD=123456 (change if you want)

## Run
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Open http://127.0.0.1:8000

## Test the key
```powershell
cd backend
.venv\Scripts\activate
python ..\scripts\test_gemini_key.py
```
# AIVex
