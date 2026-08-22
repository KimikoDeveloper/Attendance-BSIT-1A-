# BSIT Attendance Ledger

A responsive attendance web app with a real backend (Node.js, no extra
packages to install) plus localStorage on the frontend to remember who's
logged in between page refreshes.

## How it works

- **Backend** (`server.js`): a plain Node.js HTTP server. No `npm install`
  needed — it only uses built-in modules. It serves the frontend files and a
  JSON REST API, and persists everything to `data/db.json` (students, daily
  codes, attendance records). This is the source of truth.
- **Frontend** (`public/`): plain HTML/CSS/JS, one page per role. After
  logging in, the student or admin's session is cached in the browser's
  `localStorage` so refreshing the page keeps them logged in — but all
  attendance data itself lives on the backend, not in localStorage.

## Running it

```bash
node server.js
```

Then open **http://localhost:3000** in your browser.

- **Student login:** full name + 10-digit student number (must already be
  on the roster — ask the admin to add you first).
- **Admin login:** username `admin`, password `admin123` (change these two
  constants at the top of `server.js` before deploying for real).

## Features

- **Student side**
  - Log in with name + 10-digit student number.
  - Enter the daily 4-digit code to be marked present. Wrong code, no code
    yet, or already marked are all handled with a clear message.
  - See today's status and a full personal history table (present/absent
    per day a code was released).
- **Admin side**
  - Generate a new random 4-digit code once per day — students can't mark
    themselves present without it.
  - Add or remove students from the roster (10-digit number is validated).
  - View the full roster's present/absent status for today, yesterday, or
    any earlier date a code was generated for, with a present/absent count
    summary.
- Fully responsive layout — usable on phone, tablet, and desktop.

## Project structure

```
attendance-app/
├── server.js              # backend: static file server + REST API
├── data/
│   └── db.json            # persisted students / codes / attendance
└── public/
    ├── index.html          # login (student / admin tabs)
    ├── student.html        # student dashboard
    ├── admin.html          # admin dashboard
    ├── css/style.css
    └── js/
        ├── api.js          # fetch + localStorage session helpers
        ├── login.js
        ├── student.js
        └── admin.js
```

## API reference

| Method | Route                              | Purpose                              |
|--------|-------------------------------------|---------------------------------------|
| GET    | `/api/students`                     | list roster                           |
| POST   | `/api/students`                     | add a student `{name, studentNumber}` |
| DELETE | `/api/students/:studentNumber`      | remove a student                      |
| POST   | `/api/admin/login`                  | `{username, password}`                |
| POST   | `/api/student/login`                | `{name, studentNumber}`               |
| POST   | `/api/code/generate`                | admin: generate today's 4-digit code  |
| GET    | `/api/code/today`                   | admin: view today's code              |
| POST   | `/api/attendance/mark`              | `{studentNumber, code}`               |
| GET    | `/api/attendance?date=YYYY-MM-DD`   | roster + status for a date            |
| GET    | `/api/attendance/dates`             | all dates that had a code released    |
| GET    | `/api/attendance/student/:number`   | one student's full history            |

## Notes / next steps for production use

- Admin auth is a simple username/password check with no session tokens —
  fine for a class project, not for production. Add real sessions/JWT and
  hash the password before deploying publicly.
- `data/db.json` is a flat file, which is easy to inspect and back up but
  not built for concurrent heavy writes — swap in SQLite/Postgres if this
  ever needs to handle a large program.
