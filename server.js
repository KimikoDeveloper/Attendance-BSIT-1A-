/**
 * BSIT Attendance System — Backend Server
 * Pure Node.js (no npm install needed). Uses only built-in modules.
 *
 * Data is persisted to data/db.json on disk (acts as the backend database).
 * The frontend additionally caches the logged-in session in localStorage
 * so a page refresh keeps the user logged in.
 *
 * Run with:  node server.js
 * Then open: http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Hard-coded admin credentials (school-project scope — change for real use).
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin321';

// ---------- tiny JSON "database" helpers ----------

function readDB() {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeStr() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function normalizeNum(str) {
  return String(str || '').replace(/\D/g, '');
}

// ---------- HTTP helpers ----------

function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = '';
    req.on('data', (c) => (chunks += c));
    req.on('end', () => {
      if (!chunks) return resolve({});
      try {
        resolve(JSON.parse(chunks));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(PUBLIC_DIR, filePath);

  // prevent path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---------- API route handlers ----------

async function handleApi(req, res, pathname, query) {
  const db = readDB();

  // GET /api/students
  if (pathname === '/api/students' && req.method === 'GET') {
    return sendJSON(res, 200, { students: db.students });
  }

  // POST /api/students  { name, studentNumber }
  if (pathname === '/api/students' && req.method === 'POST') {
    const body = await readBody(req);
    const name = (body.name || '').trim();
    const studentNumber = normalizeNum(body.studentNumber);

    if (!name || studentNumber.length !== 10) {
      return sendJSON(res, 400, { error: 'Name and a valid 10-digit student number are required.' });
    }
    if (db.students.some((s) => s.studentNumber === studentNumber)) {
      return sendJSON(res, 409, { error: 'A student with that student number already exists.' });
    }
    const student = { id: crypto.randomUUID(), name, studentNumber };
    db.students.push(student);
    writeDB(db);
    return sendJSON(res, 201, { student });
  }

  // DELETE /api/students/:studentNumber
  if (pathname.startsWith('/api/students/') && req.method === 'DELETE') {
    const studentNumber = normalizeNum(decodeURIComponent(pathname.split('/').pop()));
    const before = db.students.length;
    db.students = db.students.filter((s) => s.studentNumber !== studentNumber);
    if (db.students.length === before) {
      return sendJSON(res, 404, { error: 'Student not found.' });
    }
    writeDB(db);
    return sendJSON(res, 200, { success: true });
  }

  // POST /api/admin/login  { username, password }
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const body = await readBody(req);
    if (body.username === ADMIN_USERNAME && body.password === ADMIN_PASSWORD) {
      return sendJSON(res, 200, { success: true });
    }
    return sendJSON(res, 401, { error: 'Invalid admin username or password.' });
  }

  // POST /api/student/login  { name, studentNumber }
  if (pathname === '/api/student/login' && req.method === 'POST') {
    const body = await readBody(req);
    const name = (body.name || '').trim();
    const studentNumber = normalizeNum(body.studentNumber);

    if (!name || studentNumber.length !== 10) {
      return sendJSON(res, 400, { error: 'Enter your full name and a 10-digit student number.' });
    }
    const student = db.students.find(
      (s) => s.studentNumber === studentNumber && s.name.toLowerCase() === name.toLowerCase()
    );
    if (!student) {
      return sendJSON(res, 404, {
        error: 'No matching student found. Check your name and student number, or ask the admin to add you.',
      });
    }
    return sendJSON(res, 200, { student });
  }

  // POST /api/code/generate  -> admin generates today's 4-digit code
  if (pathname === '/api/code/generate' && req.method === 'POST') {
    const date = todayStr();
    const code = generateCode();
    db.codes[date] = code;
    if (!db.attendance[date]) db.attendance[date] = {};
    writeDB(db);
    return sendJSON(res, 200, { date, code });
  }

  // GET /api/code/today -> admin view of today's code (generates status only, not for students)
  if (pathname === '/api/code/today' && req.method === 'GET') {
    const date = todayStr();
    return sendJSON(res, 200, { date, code: db.codes[date] || null });
  }

  // POST /api/attendance/mark  { studentNumber, code }
  if (pathname === '/api/attendance/mark' && req.method === 'POST') {
    const body = await readBody(req);
    const studentNumber = normalizeNum(body.studentNumber);
    const code = String(body.code || '').trim();
    const date = todayStr();

    const student = db.students.find((s) => s.studentNumber === studentNumber);
    if (!student) return sendJSON(res, 404, { error: 'Student record not found.' });

    const todayCode = db.codes[date];
    if (!todayCode) {
      return sendJSON(res, 400, { error: "The admin hasn't released today's attendance code yet." });
    }
    if (code !== todayCode) {
      return sendJSON(res, 400, { error: 'Incorrect code. Check with your admin/instructor and try again.' });
    }

    if (!db.attendance[date]) db.attendance[date] = {};
    if (db.attendance[date][studentNumber]) {
      return sendJSON(res, 200, {
        alreadyMarked: true,
        record: db.attendance[date][studentNumber],
        message: `You were already marked present today at ${db.attendance[date][studentNumber].time}.`,
      });
    }

    const record = { name: student.name, studentNumber, time: timeStr() };
    db.attendance[date][studentNumber] = record;
    writeDB(db);
    return sendJSON(res, 200, { success: true, record, date });
  }

  // GET /api/attendance?date=YYYY-MM-DD  -> full roster status for that date
  if (pathname === '/api/attendance' && req.method === 'GET') {
    const date = query.date || todayStr();
    const dayRecords = db.attendance[date] || {};
    const hasSession = Object.prototype.hasOwnProperty.call(db.codes, date);

    const roster = db.students.map((s) => {
      const present = dayRecords[s.studentNumber];
      return {
        name: s.name,
        studentNumber: s.studentNumber,
        status: present ? 'present' : hasSession ? 'absent' : 'no-session',
        time: present ? present.time : null,
      };
    });

    return sendJSON(res, 200, { date, hasSession, roster });
  }

  // GET /api/attendance/dates -> list of dates that have a session (code generated), newest first
  if (pathname === '/api/attendance/dates' && req.method === 'GET') {
    const dates = Object.keys(db.codes).sort((a, b) => (a < b ? 1 : -1));
    return sendJSON(res, 200, { dates });
  }

  // GET /api/attendance/student/:studentNumber -> personal history
  if (pathname.startsWith('/api/attendance/student/') && req.method === 'GET') {
    const studentNumber = normalizeNum(decodeURIComponent(pathname.split('/').pop()));
    const dates = Object.keys(db.codes).sort((a, b) => (a < b ? 1 : -1));
    const history = dates.map((date) => {
      const rec = (db.attendance[date] || {})[studentNumber];
      return { date, status: rec ? 'present' : 'absent', time: rec ? rec.time : null };
    });
    return sendJSON(res, 200, { history });
  }

  return sendJSON(res, 404, { error: 'Unknown API route.' });
}

// ---------- server ----------

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = decodeURI(parsed.pathname);

  if (pathname.startsWith('/api/')) {
    try {
      await handleApi(req, res, pathname, parsed.query);
    } catch (err) {
      console.error(err);
      sendJSON(res, 500, { error: 'Server error.' });
    }
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`BSIT Attendance server running at http://localhost:${PORT}`);
  console.log(`Admin login -> username: ${ADMIN_USERNAME} / password: ${ADMIN_PASSWORD}`);
});
