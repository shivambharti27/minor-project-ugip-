// Talks to the Python backend. In production set VITE_API_URL (e.g. https://your-backend.onrender.com/api).
const BASE = import.meta.env.VITE_API_URL || '/api';
async function req(path, opts = {}) {
  const r = await fetch(BASE + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!r.ok) throw new Error('API ' + r.status);
  return r.json();
}
const post = (path, body) => req(path, { method: 'POST', body: JSON.stringify(body) });
export const api = {
  estimate: (measurements, options) => post('/estimate', { measurements, options }),
  projects: () => req('/projects'),
  addProject: p => post('/projects', p),
  deleteProject: id => req('/projects/' + id, { method: 'DELETE' }),
  chat: (question, plan, history) => post('/chat', { question, plan, history })
};
