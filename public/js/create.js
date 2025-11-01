function getUserToken() { return localStorage.getItem('userToken'); }
if (!getUserToken()) { window.location.href = '/index.html'; }

async function fetchJSON(url, options = {}) {
  const headers = options.headers || {};
  headers['X-User-Token'] = getUserToken();
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

// Read optional group_id from URL
const params = new URLSearchParams(location.search);
const groupIdParam = params.get('group_id');

// If group_id present, display context banner with group name
(async () => {
  if (!groupIdParam) return;
  try {
    const g = await fetchJSON(`/api/v1/groups/${groupIdParam}`);
    const box = document.getElementById('groupContext');
    if (box) {
      box.style.display = 'block';
      box.innerHTML = `Ce covoiturage sera lié au groupe <strong>${g.name}</strong>.`;
    }
  } catch {}
})();

document.getElementById('createForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;
  const origin = document.getElementById('origin').value.trim();
  const destination = document.getElementById('destination').value.trim();
  const seats_total = parseInt(document.getElementById('seats_total').value, 10);
  const note = document.getElementById('note').value.trim();
  const password = document.getElementById('password').value;

  if (!title || !date || !origin || !destination || !seats_total) {
    alert('Champs requis manquants');
    return;
  }

  try {
    const data = await fetchJSON('/api/v1/rides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date, time, origin, destination, seats_total, note, password, group_id: groupIdParam ? parseInt(groupIdParam, 10) : null })
    });
    const inviteBox = document.getElementById('inviteBox');
    const inviteInput = document.getElementById('inviteLink');
    const copyBtn = document.getElementById('copyInviteBtn');
    const url = new URL(window.location.origin);
    url.pathname = '/ride.html';
    url.search = `?code=${data.invite_code}`;
    inviteInput.value = url.toString();
    inviteBox.style.display = 'flex';
    copyBtn.onclick = async () => {
      try { await navigator.clipboard.writeText(inviteInput.value); alert('✅ Lien copié'); } catch {}
    };
    setTimeout(() => { window.location.href = `/ride.html?id=${data.id}`; }, 900);
  } catch (e) {
    alert('Erreur lors de la création');
  }
});
