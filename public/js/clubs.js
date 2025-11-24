// Fonctions utilitaires
function getUserToken() { 
  return localStorage.getItem('userToken'); 
}

function fetchJSON(url, options = {}) {
  const headers = options.headers || {};
  headers['X-User-Token'] = getUserToken();
  return fetch(url, { ...options, headers }).then(res => {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  });
}

// Vérification d'authentification
if (!getUserToken()) {
  // Éviter les boucles de redirection
  if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
    window.location.href = '/index.html';
  }
  // Si déjà sur la page d'accueil, ne pas rediriger
  return;
}

const listEl = document.getElementById('clubsList');
const groupIdParam = new URLSearchParams(location.search).get('id');

// Note: Les fonctions dropdown sont maintenant définies directement dans le HTML

function groupCard(g) {
  const type = g.kind || g.type || 'Club';
  const ownerBadge = g.role === 'owner' ? '<span class="badge badge-owner">propriétaire</span>' : '';
  const desc = truncate(g.description || '', 160);
  const eventsCount = g.events_count ?? (g.rides ? g.rides.length : null);
  const membersCount = g.members_count ?? (g.members ? g.members.length : null);
  
  const statsRow = `
    <div class="stats mt-8">
      <div class="stat-card"><div class="stat-number">${eventsCount != null ? eventsCount : '-'}</div><div class="stat-label">Événements</div></div>
      <div class="stat-card"><div class="stat-number">${membersCount != null ? membersCount : '-'}</div><div class="stat-label">Membres</div></div>
    </div>`;
    
  return `
    <div class="car-card">
      <div class="car-header">
        <div><strong>${g.name}</strong> ${ownerBadge}</div>
        <div class="car-capacity text-secondary">${type}</div>
      </div>
      <div class="text-secondary">${desc || 'Aucune description'}</div>
      ${statsRow}
      <div class="btn-row">
        <a class="btn btn-primary" href="/club-detail.html?id=${g.id}">Voir le club</a>
      </div>
    </div>
  `;
}

function truncate(text, len = 140) {
  if (!text) return '';
  return text.length > len ? text.slice(0, len - 1) + '…' : text;
}

async function loadGroups() {
  try {
    // Utilise l'API Rails JSON qui renvoie les groupes dont l'utilisateur est membre
    const groups = await fetchJSON('/api/v1/groups');
    if (!groups || groups.length === 0) {
      listEl.innerHTML = `
        <div class="card grid-span-all text-center">
          <div class="muted mb-8">Aucun club pour le moment.</div>
          <a class="btn" href="/club-create.html">➕ Créer un nouveau club</a>
        </div>
      `;
      return;
    }
    listEl.innerHTML = groups.map(groupCard).join('');
  } catch (error) {
    console.error('Erreur chargement clubs:', error);
    // Afficher un message d'erreur moins intrusif
    listEl.innerHTML = `
      <div class="card grid-span-all text-center">
        <div class="muted mb-8">⚠️ Erreur de chargement des clubs</div>
        <p class="text-small text-secondary">Vérifiez votre connexion internet</p>
        <button class="btn btn-secondary" onclick="loadGroups()">🔄 Réessayer</button>
      </div>
    `;
  }
}

// Creation/join sont déplacés vers club-create.html désormais

function rideRow(r) {
  const dt = new Date(r.date + 'T' + (r.time || '00:00'));
  const dateStr = dt.toLocaleDateString('fr-FR') + (r.time ? ' à ' + r.time : '');
  
  return `
    <div class="car-card">
      <div class="car-header">
        <div class="car-driver">${r.title}</div>
      </div>
      <div>${dateStr}</div>
      <div>${r.origin} → ${r.destination}</div>
      <div class="btn-row">
        <a class="btn btn-primary" href="/ride.html?id=${r.id}">Voir</a>
      </div>
    </div>
  `;
}

function memberCard(m, isOwnerView, groupId) {
  const avatar = m.avatar_url ? `<img src="${m.avatar_url}" alt="${m.display_name || ''}" class="avatar-28">` : '<div class="avatar-28 avatar-placeholder"></div>';
  const name = m.display_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Membre';
  let actions = '';
  if (isOwnerView) {
    const toggleTo = m.role === 'owner' ? 'member' : 'owner';
    const label = m.role === 'owner' ? 'Retirer propriétaire' : 'Nommer propriétaire';
    actions = `<button class="btn btn-secondary" data-role="${toggleTo}" data-user="${m.id}" data-group="${groupId}">${label}</button>`;
  }
  return `
    <div class="car-card">
      <div class="car-header">
        <div class="row items-center gap-8">
          ${avatar}
          <div>${name}</div>
        </div>
        <div class="car-capacity">${m.role}</div>
      </div>
      <div class="mt-8">${actions}</div>
    </div>
  `;
}

async function loadGroupDetail(id) {
  try {
    const g = API ? await API.get(`/groups/${id}`) : await fetchJSON(`/api/v1/groups/${id}`);
    // Hide list/create/join cards
    if (myGroupsCard) myGroupsCard.style.display = 'none';
    if (createGroupCard) createGroupCard.style.display = 'none';
    if (joinGroupCard) joinGroupCard.style.display = 'none';
    if (groupDetail) groupDetail.style.display = 'block';

    // Split rides upcoming/past
    const now = new Date();
    const upcoming = [];
    const past = [];
    (g.rides || []).forEach(r => {
      const dt = new Date(r.date + 'T' + (r.time || '00:00'));
      (dt >= now ? upcoming : past).push(r);
    });

    const invite = g.invite_code ? `<div class="link-box mt-8"><input value="${g.invite_code}" readonly /></div>` : '';
    const createBtn = `<a class="btn" href="/create.html?group_id=${g.id}">➕ Créer un covoiturage</a>`;

    groupDetail.innerHTML = `
      <div class="card">
        <h2>${g.name}</h2>
        <p>${g.description || ''}</p>
        <div class="actions-row">
          ${createBtn}
          ${invite}
        </div>
      </div>
      <div class="card">
        <h3>Événements à venir</h3>
        <div id="groupUpcoming">${upcoming.map(rideRow).join('') || '<div class="secondary">Aucun événement à venir</div>'}</div>
      </div>
      <div class="card">
        <h3>Événements passés</h3>
        <div id="groupPast">${past.map(rideRow).join('') || '<div class="secondary">Aucun événement passé</div>'}</div>
      </div>
      <div class="card">
        <h3>Membres</h3>
        <div id="groupMembers">${(g.members || []).map(m => memberCard(m, g.role === 'owner', g.id)).join('')}</div>
      </div>
    `;

    // Leave button removed (feature disabled)

    // Bind promote/demote
    document.querySelectorAll('#groupMembers [data-user]')?.forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.getAttribute('data-user');
        const role = btn.getAttribute('data-role');
        try {
          if (API) {
            await API.put(`/groups/${g.id}/members/${userId}`, { role });
          } else {
            await fetchJSON(`/api/v1/groups/${g.id}/members/${userId}`, {
              method: 'PATCH', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role })
            });
          }
          await loadGroupDetail(g.id);
        } catch { 
          if (UI && UI.showError) {
            UI.showError('Modification impossible');
          } else {
            alert('Modification impossible');
          }
        }
      });
    });
  } catch (e) {
    if (UI && UI.showError) {
      UI.showError('Groupe introuvable');
    } else {
      alert('Groupe introuvable');
    }
  }
}

// Fonction pour charger les trajets à venir
async function loadMyUpcoming() {
  try {
    const box = document.getElementById('myUpcoming');
    if (!box) return;
    const mine = await fetchJSON('/api/v1/my_rides');
    const now = new Date();
    const all = [].concat(mine.as_driver || [], mine.as_passenger || []);
    const upcoming = all.filter(r => {
      try { return new Date(r.date + 'T' + (r.time || '00:00')) >= now; } catch { return false; }
    }).sort((a,b)=> new Date(a.date) - new Date(b.date)).slice(0, 8);
    box.innerHTML = upcoming.length ? upcoming.map(rideItem).join('') : '<div class="secondary">Aucun trajet à venir</div>';
  } catch {}
}

function rideItem(r) {
  const dt = new Date(r.date + 'T' + (r.time || '00:00'));
  const when = dt.toLocaleDateString('fr-FR') + (r.time ? ' à ' + r.time : '');
  
  return `
    <div class="car-card">
      <div class="car-header">
        <div class="car-driver">${r.title}</div>
        <div class="car-capacity">${when}</div>
      </div>
      <div class="card-desc">${(r.origin || '')}${r.destination ? ' → ' + r.destination : ''}</div>
      <div class="card-footer">
        <a class="btn btn-primary btn-full" href="/event-detail.html?eventId=${r.id}">Voir</a>
      </div>
    </div>
  `;
}

// Event listener pour fermer le dropdown en cliquant à l'extérieur
document.addEventListener('click', function(event) {
  const dropdown = document.getElementById('joinDropdown');
  const button = event.target.closest('.join-dropdown');
  
  if (!button && dropdown && dropdown.classList.contains('show')) {
    dropdown.classList.remove('show');
  }
});

// Initialisation
if (groupIdParam) {
  loadGroupDetail(groupIdParam);
} else {
  loadGroups();
  loadMyUpcoming();
}
