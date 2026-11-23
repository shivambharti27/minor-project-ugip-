"""Civil-engineering assistant using the Google Gemini API.
The API key stays on the server (GEMINI_API_KEY in backend/.env) and is never sent to the browser."""
import os

SYSTEM = (
    "You are the civil-engineering assistant of Ghar AI, a home design tool for India. "
    "Answer questions about house construction (foundation, slab, beams, columns, bricks, cement, steel, curing, "
    "floor plans, Vastu basics, municipal map approval, costs). Be short, clear and practical. "
    "Reply in the same language the user writes in (Hinglish is fine). "
    "You give general guidance only: always say that final structural design, steel and slab thickness must be "
    "confirmed by a licensed structural engineer. If a question is not about building or homes, politely say you only help with that."
)


def build_prompt(question, plan):
    ctx = ""
    if plan:
        ctx = (f"The user's current plan: plot {plan.get('length')} x {plan.get('width')} ft, "
               f"{plan.get('facing')}-facing, about {plan.get('area')} sq ft, {plan.get('summary', '')}.\n\n")
    return ctx + "Question: " + question

def ask(question, plan=None, history=None):
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        return {"ok": False, "reply": "Chatbot is not set up yet: add GEMINI_API_KEY to backend/.env and restart the server."}
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=key)
        contents = []
        for m in (history or [])[-6:]:
            contents.append(types.Content(role="user" if m.get("role") == "user" else "model", parts=[types.Part(text=str(m.get("text", ""))[:2000])]))
        contents.append(types.Content(role="user", parts=[types.Part(text=build_prompt(question, plan))]))
        # If one model is busy (503) or missing, try the next one instead of failing.
        first = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
        last_err = None
        for name in dict.fromkeys([first, "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-2.5-flash"]):
            try:
                res = client.models.generate_content(model=name, contents=contents,
                                                     config=types.GenerateContentConfig(system_instruction=SYSTEM, max_output_tokens=700))
                return {"ok": True, "reply": (res.text or "").strip() or "I could not generate an answer. Please try again."}
            except Exception as e:
                last_err = e
                print("GEMINI model", name, "failed:", repr(e)[:300])
        raise last_err
    except Exception as e:  # network, quota, wrong model name, bad key...
        print("GEMINI ERROR:", repr(e)[:600])
        return {"ok": False, "reply": f"The AI service returned an error ({type(e).__name__}). Check the API key and GEMINI_MODEL in backend/.env."}
