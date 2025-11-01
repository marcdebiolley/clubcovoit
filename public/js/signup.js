function setUserToken(token) { localStorage.setItem('userToken', token); }
function getUserToken() { return localStorage.getItem('userToken'); }

if (getUserToken()) {
  window.location.href = '/index.html';
}

async function isDisplayNameUnique(name) {
  if (!name) return true;
  try {
    const res = await fetch(`/api/v1/users/unique?display_name=${encodeURIComponent(name)}`);
    if (!res.ok) return true; // if endpoint not supported, skip precheck
    const data = await res.json().catch(() => ({}));
    if (typeof data.unique === 'boolean') return data.unique;
    // Some APIs return {exists:true}
    if (typeof data.exists === 'boolean') return !data.exists;
    return true;
  } catch { return true; }
}

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const email_confirm = document.getElementById('email_confirm')?.value.trim();
  const password = document.getElementById('password').value;
  const password_confirm = document.getElementById('password_confirm')?.value;
  const display_name = document.getElementById('display_name').value.trim();
  const first_name = document.getElementById('first_name')?.value.trim() || '';
  const last_name = document.getElementById('last_name')?.value.trim() || '';
  try {
    // Basic front validations
    if (!email || !password || !display_name) throw new Error('Champs requis manquants');
    if (email_confirm != null && email !== email_confirm) throw new Error("Les emails ne correspondent pas");
    if (password_confirm != null && password !== password_confirm) throw new Error("Les mots de passe ne correspondent pas");
    if (display_name.length < 3) throw new Error('Le pseudo doit contenir au moins 3 caractères');
    const unique = await isDisplayNameUnique(display_name);
    if (!unique) throw new Error('Ce pseudo est déjà pris, veuillez en choisir un autre');

    const res = await fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name, first_name, last_name })
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = {}; }
    if (!res.ok) {
      // If backend enforces unique pseudo, surface friendly message
      const msg = (data && (data.error || data.details || data.message)) || text || 'Inscription impossible';
      if (/display[_\s-]?name|pseudo|unique|already/i.test(String(msg))) {
        throw new Error('Ce pseudo est déjà pris, veuillez en choisir un autre');
      }
      throw new Error(Array.isArray(msg) ? msg.join(', ') : String(msg));
    }
    setUserToken(data.token);
    try { window.plausible && window.plausible('Signup', { props: { method: 'email' } }); } catch {}
    window.location.href = '/index.html';
  } catch (e) {
    alert(e.message || 'Impossible de créer le compte');
  }
});
