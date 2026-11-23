import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()
import chat  # noqa: E402
import db  # noqa: E402
from estimate import estimate  # noqa: E402
from rates import PRESETS  # noqa: E402

app = FastAPI(title="Ghar AI API")
origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])
db.init()


class Window(BaseModel):
    w: float
    h: float


class Room(BaseModel):
    area: float = 0
    per: float = 0


class Measurements(BaseModel):
    builtArea: float = Field(gt=0, le=100000)
    extLen: float = Field(ge=0, le=5000)
    intLen: float = Field(ge=0, le=5000)
    bathDoors: int = Field(ge=0, le=50)
    flushDoors: int = Field(ge=0, le=100)
    mainDoors: int = Field(ge=0, le=5)
    windows: list[Window] = []
    winArea: float = Field(ge=0, le=10000)
    wetRooms: list[Room] = []
    kitchens: list[Room] = []


class Options(BaseModel):
    floors: int = Field(1, ge=1, le=3)
    grade: str = Field("standard", pattern="^(economy|standard|premium)$")
    labourPerSqft: Optional[float] = Field(None, ge=0, le=5000)
    miscPct: float = Field(5, ge=0, le=30)
    rates: dict[str, float] = {}


class EstimateIn(BaseModel):
    measurements: Measurements
    options: Options = Options()


class ProjectIn(BaseModel):
    name: str = Field("My design", max_length=80)
    length: float = Field(gt=0, le=1000)
    width: float = Field(gt=0, le=1000)
    facing: str = Field(pattern="^[NSEW]$")
    bhk: int = Field(0, ge=0, le=20)
    villa: bool = False
    thumb: str = Field("", max_length=60000)


class ChatIn(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    plan: Optional[dict] = None
    history: list[dict] = []


@app.get("/api/health")
def health():
    return {"status": "ok", "chatbot": bool(os.environ.get("GEMINI_API_KEY"))}


@app.get("/api/presets")
def presets():
    return PRESETS


@app.post("/api/estimate")
def post_estimate(body: EstimateIn):
    m = body.measurements.model_dump()
    return estimate(m, body.options.model_dump())


@app.get("/api/projects")
def get_projects():
    return db.list_projects()


@app.post("/api/projects", status_code=201)
def post_project(p: ProjectIn):
    return {"id": db.add_project(p)}


@app.delete("/api/projects/{pid}")
def del_project(pid: int):
    if not db.delete_project(pid):
        raise HTTPException(404, "Project not found")
    return {"deleted": pid}


@app.post("/api/chat")
def post_chat(c: ChatIn):
    return chat.ask(c.question, c.plan, c.history)
