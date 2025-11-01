function setUserToken(token) { localStorage.setItem('userToken', token); }
function getUserToken() { return localStorage.getItem('userToken'); }

if (getUserToken()) {
  window.location.href = '/index.html';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  try {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('LOGIN_FAILED');
    const data = await res.json();
    setUserToken(data.token);
    window.location.href = '/index.html';
  } catch (e) {
    alert('Identifiants invalides');
  }
});
