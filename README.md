# Ghar AI – Home Design, Material Estimation & Civil Assistant (minor project)

## Run (frontend)
```bash
cd frontend
npm install        # installs three, vite, vitest from package.json
npm run dev        # open http://localhost:5173
npm test           # vitest unit tests
npm run check      # full regression: 30,000+ layout checks
```

## Folder map
| Path | What it holds |
|---|---|
| `frontend/index.html` | page layout (inputs, tabs, canvas) + CSS |
| `frontend/src/main.js` | button/input events, "Show another design" |
| `frontend/src/config/` | constants (colors, door widths) and the room list per plot area |
| `frontend/src/engine/` | planner brain: random numbers, slicing tree, scoring rules, planner, doors (no DOM code) |
| `frontend/src/render/` | 2D canvas, 3D Three.js, furniture |
| `frontend/tests/` | vitest tests + full regression script |
| `reference/` | original single-file version, for comparison |
| `backend/` | (later) Python FastAPI: material estimation, database, chatbot |
