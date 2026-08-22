// If already logged in, skip straight to the right dashboard.
(function redirectIfLoggedIn() {
  const s = session.get();
  if (s && s.role === 'student') window.location.href = 'student.html';
  if (s && s.role === 'admin') window.location.href = 'admin.html';
})();

const errorMsg = document.getElementById('errorMsg');
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add('show');
}
function clearError() {
  errorMsg.classList.remove('show');
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    clearError();
  });
});

// Student login
document.getElementById('studentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  const name = document.getElementById('sName').value.trim();
  const studentNumber = document.getElementById('sNumber').value.trim();

  if (!/^\d{10}$/.test(studentNumber)) {
    return showError('Student number must be exactly 10 digits.');
  }

  try {
    const { student } = await api.post('/api/student/login', { name, studentNumber });
    session.setStudent(student);
    window.location.href = 'student.html';
  } catch (err) {
    showError(err.message);
  }
});

// Admin login
document.getElementById('adminForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  const username = document.getElementById('aUser').value.trim();
  const password = document.getElementById('aPass').value;

  try {
    await api.post('/api/admin/login', { username, password });
    session.setAdmin();
    window.location.href = 'admin.html';
  } catch (err) {
    showError(err.message);
  }
});
