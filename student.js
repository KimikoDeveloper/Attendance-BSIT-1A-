const me = session.get();
if (!me || me.role !== 'student') {
  window.location.href = 'index.html';
}

document.getElementById('whoName').textContent = `${me.name} · ${me.studentNumber}`;
document.getElementById('logoutBtn').addEventListener('click', () => {
  session.clear();
  window.location.href = 'index.html';
});

const todayISOStr = todayISO();
document.getElementById('todayLabel').textContent = fmtDate(todayISOStr);
document.getElementById('todayLabel2').textContent = fmtDate(todayISOStr);

const markError = document.getElementById('markError');
const markSuccess = document.getElementById('markSuccess');

function showMarkError(msg) {
  markSuccess.classList.remove('show');
  markError.textContent = msg;
  markError.classList.add('show');
}
function showMarkSuccess(msg) {
  markError.classList.remove('show');
  markSuccess.textContent = msg;
  markSuccess.classList.add('show');
}

async function refreshTodayStatus() {
  const box = document.getElementById('todayStatusBox');
  try {
    const { roster } = await api.get(`/api/attendance?date=${todayISOStr}`);
    const mine = roster.find((r) => r.studentNumber === me.studentNumber);
    if (!mine) {
      box.innerHTML = `<span class="chip no-session">Not on roster</span>`;
      return;
    }
    if (mine.status === 'present') {
      box.innerHTML = `<span class="chip present">Present</span> <span class="mono" style="margin-left:8px;color:var(--ink-soft);font-size:13px;">marked at ${mine.time}</span>`;
      document.getElementById('markBtn').disabled = true;
      document.getElementById('markBtn').textContent = 'Already marked present';
    } else if (mine.status === 'absent') {
      box.innerHTML = `<span class="chip absent">Not yet marked</span>`;
    } else {
      box.innerHTML = `<span class="chip no-session">No code released yet</span>`;
    }
  } catch (err) {
    box.innerHTML = `<span class="chip no-session">Unable to load</span>`;
  }
}

async function refreshHistory() {
  const tbody = document.getElementById('historyBody');
  try {
    const { history } = await api.get(`/api/attendance/student/${me.studentNumber}`);
    if (!history.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No attendance sessions have been recorded yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = history
      .map(
        (h, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${fmtDate(h.date)}</td>
        <td><span class="chip ${h.status}">${h.status}</span></td>
        <td class="mono">${h.time || '—'}</td>
      </tr>`
      )
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="4">Could not load history.</td></tr>`;
  }
}

document.getElementById('markForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = document.getElementById('codeInput').value.trim();
  if (!/^\d{4}$/.test(code)) {
    return showMarkError('Enter the 4-digit code exactly as given.');
  }
  const btn = document.getElementById('markBtn');
  btn.disabled = true;
  try {
    const data = await api.post('/api/attendance/mark', { studentNumber: me.studentNumber, code });
    if (data.alreadyMarked) {
      showMarkSuccess(data.message);
    } else {
      showMarkSuccess(`Marked present at ${data.record.time}. See you next session!`);
    }
    await refreshTodayStatus();
    await refreshHistory();
  } catch (err) {
    showMarkError(err.message);
    btn.disabled = false;
  }
});

refreshTodayStatus();
refreshHistory();
