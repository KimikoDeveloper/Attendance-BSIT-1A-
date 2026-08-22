// Thin wrapper around fetch() for talking to the backend API.
const api = {
  async get(path) {
    const res = await fetch(path);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  },
  async post(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  },
  async del(path) {
    const res = await fetch(path, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  },
};

// ---- localStorage session helpers (client-side "remember me") ----
const session = {
  setStudent(student) {
    localStorage.setItem('bsit_session', JSON.stringify({ role: 'student', ...student }));
  },
  setAdmin() {
    localStorage.setItem('bsit_session', JSON.stringify({ role: 'admin' }));
  },
  get() {
    try {
      return JSON.parse(localStorage.getItem('bsit_session'));
    } catch {
      return null;
    }
  },
  clear() {
    localStorage.removeItem('bsit_session');
  },
};

function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
