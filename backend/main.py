from __future__ import annotations

import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi import Request

from app.routes import router as api_router

app = FastAPI(title="Gemini Quiz Builder")
app.include_router(api_router, prefix="/api")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    
    return JSONResponse(status_code=500, content={"detail": f"Internal Server Error: {type(exc).__name__}: {str(exc)}"})


@app.get("/")
def index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.get("/teacher")
def teacher():
    return FileResponse(os.path.join(STATIC_DIR, "teacher.html"))

@app.get("/student")
def student():
    return FileResponse(os.path.join(STATIC_DIR, "student.html"))
