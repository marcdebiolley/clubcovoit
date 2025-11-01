function getUserToken() { return localStorage.getItem('userToken'); }
if (!getUserToken()) { window.location.href = '/login.html'; }

async function fetchJSON(url, options = {}) {
  const headers = options.headers || {};
  headers['X-User-Token'] = getUserToken();
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('userToken');
  window.location.href = '/login.html';
});

const form = document.getElementById('clubCreateForm');
const nameEl = document.getElementById('cc_name');
const typeEl = document.getElementById('cc_type');
const descEl = document.getElementById('cc_desc');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = (nameEl?.value || '').trim();
  const kind = (typeEl?.value || '').trim();
  const description = (descEl?.value || '').trim();
  if (!name) return alert('Nom du club requis');
  try {
    const data = await fetchJSON('/api/v1/groups', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, kind })
    });
    try { window.plausible && window.plausible('ClubCreated'); } catch {}
    // Try several shapes: {id}, {group: {id}}, or resolve via invite_code/name
    let newId = data?.id || data?.group?.id || null;
    if (!newId) {
      const inv = data?.invite_code || data?.group?.invite_code;
      try {
        const groups = await fetchJSON('/api/v1/groups');
        const found = groups.find(g => (inv && g.invite_code === inv) || g.name === name);
        if (found) newId = found.id;
      } catch (e) { /* ignore, fallback below */ }
    }
    if (newId) {
      window.location.href = `/club-detail.html?id=${encodeURIComponent(newId)}`;
      return;
    }
    console.warn('Club créé, réponse inattendue:', data);
    alert('Club créé, retour à la liste.');
    window.location.href = '/clubs.html';
  } catch (e) {
    alert("Création de club impossible");
  }
});
