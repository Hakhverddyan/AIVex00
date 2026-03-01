import os
from dotenv import load_dotenv
from google import genai

def main():
    load_dotenv()
    key = os.getenv("GEMINI_API_KEY","").strip()
    model = os.getenv("GEMINI_MODEL","gemini-2.5-flash").strip() or "gemini-2.5-flash"
    if not key:
        raise RuntimeError("Missing GEMINI_API_KEY. Create backend/.env from .env.example and paste your key.")
    client = genai.Client(api_key=key)
    resp = client.models.generate_content(model=model, contents="Return the word OK.")
    print("Response:", getattr(resp, "text", "").strip())

if __name__ == "__main__":
    main()
