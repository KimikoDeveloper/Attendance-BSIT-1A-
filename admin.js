const me = session.get();
if (!me || me.role !== 'admin') {
  window.location.href = 'index.html';
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  session.clear();
  window.location.href = 'index.html';
});

const todayISOStr = todayISO();
document.getElementById('todayLabel').textContent = fmtDate(todayISOStr);

// ---------- today's code ----------

async function refreshCode() {
  const { code } = await api.get('/api/code/today');
  const el = document.getElementById('codeDisplay');
  if (code) {
    el.textContent = code;
    el.classList.remove('empty');
  } else {
    el.textContent = 'Not generated yet';
    el.classList.add('empty');
  }
}

document.getElementById('genCodeBtn').addEventListener('click', async () => {
  const btn = document.getElementById('genCodeBtn');
  btn.disabled = true;
  try {
    await api.post('/api/code/generate', {});
    await refreshCode();
    await populateDateSelect(todayISOStr);
    await loadAttendance(todayISOStr);
  } finally {
    btn.disabled = false;
  }
});

// ---------- add / remove students ----------

const addError = document.getElementById('addError');
const addSuccess = document.getElementById('addSuccess');

document.getElementById('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  addError.classList.remove('show');
  addSuccess.classList.remove('show');

  const name = document.getElementById('newName').value.trim();
  const studentNumber = document.getElementById('newNumber').value.trim();

  if (!/^\d{10}$/.test(studentNumber)) {
    addError.textContent = 'Student number must be exactly 10 digits.';
    addError.classList.add('show');
    return;
  }

  try {
    await api.post('/api/students', { name, studentNumber });
    addSuccess.textContent = `${name} added to the roster.`;
    addSuccess.classList.add('show');
    document.getElementById('addForm').reset();
    await refreshRoster();
    await loadAttendance(document.getElementById('dateSelect').value || todayISOStr);
  } catch (err) {
    addError.textContent = err.message;
    addError.classList.add('show');
  }
});

async function refreshRoster() {
  const tbody = document.getElementById('rosterBody');
  const { students } = await api.get('/api/students');
  if (!students.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No students yet. Add your first student above.</td></tr>`;
    return;
  }
  tbody.innerHTML = students
    .map(
      (s, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td>${escapeHtml(s.name)}</td>
      <td class="mono">${s.studentNumber}</td>
      <td><button class="remove-btn" data-num="${s.studentNumber}">Remove</button></td>
    </tr>`
    )
    .join('');

  tbody.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this student from the roster?')) return;
      await api.del(`/api/students/${btn.dataset.num}`);
      await refreshRoster();
      await loadAttendance(document.getElementById('dateSelect').value || todayISOStr);
    });
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ---------- attendance by date ----------

async function populateDateSelect(preferredDate) {
  const sel = document.getElementById('dateSelect');
  const { dates } = await api.get('/api/attendance/dates');
  let allDates = dates;
  if (!allDates.includes(todayISOStr)) allDates = [todayISOStr, ...allDates];

  sel.innerHTML = allDates
    .map((d) => `<option value="${d}">${fmtDate(d)}${d === todayISOStr ? ' (today)' : ''}</option>`)
    .join('');

  sel.value = preferredDate && allDates.includes(preferredDate) ? preferredDate : allDates[0];
}

document.getElementById('dateSelect').addEventListener('change', (e) => {
  loadAttendance(e.target.value);
});

document.getElementById('todayBtn').addEventListener('click', () => {
  document.getElementById('dateSelect').value = todayISOStr;
  loadAttendance(todayISOStr);
});

async function loadAttendance(date) {
  const tbody = document.getElementById('attendanceBody');
  const strip = document.getElementById('summaryStrip');
  tbody.innerHTML = `<tr class="empty-row"><td colspan="5">Loading…</td></tr>`;

  const { roster, hasSession } = await api.get(`/api/attendance?date=${date}`);

  const presentCount = roster.filter((r) => r.status === 'present').length;
  const absentCount = roster.filter((r) => r.status === 'absent').length;

  strip.innerHTML = `
    <div class="summary-pill present"><div class="n">${presentCount}</div><div class="l">Present</div></div>
    <div class="summary-pill absent"><div class="n">${absentCount}</div><div class="l">Absent</div></div>
    <div class="summary-pill"><div class="n">${roster.length}</div><div class="l">Total students</div></div>
  `;

  if (!roster.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No students on the roster yet.</td></tr>`;
    return;
  }
  if (!hasSession) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No attendance code was generated for this date.</td></tr>`;
    return;
  }

  tbody.innerHTML = roster
    .map(
      (r, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td>${escapeHtml(r.name)}</td>
      <td class="mono">${r.studentNumber}</td>
      <td><span class="chip ${r.status}">${r.status}</span></td>
      <td class="mono">${r.time || '—'}</td>
    </tr>`
    )
    .join('');
}

// ---------- init ----------

(async function init() {
  await refreshCode();
  await refreshRoster();
  await populateDateSelect(todayISOStr);
  await loadAttendance(document.getElementById('dateSelect').value);
})();
