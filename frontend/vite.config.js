import { defineConfig } from 'vite';
// In development, requests to /api are forwarded to the Python backend (uvicorn on port 8000).
export default defineConfig({ server: { proxy: { '/api': 'http://localhost:8000' } } });
