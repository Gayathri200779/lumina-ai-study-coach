document.getElementById('togglePassword').addEventListener('click', function () {
  const pw = document.getElementById('password');
  pw.type = pw.type === 'password' ? 'text' : 'password';
});

document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  window.location.href = 'profile-setup.html';
});

document.getElementById('googleBtn').addEventListener('click', function () {
  window.location.href = 'profile-setup.html';
});