// Utilise les utilitaires communs
const { Auth, API, UI, Format, URL, Components } = window.ClubCovoit;

const listEl = document.getElementById('clubsList');
const groupIdParam = URL.getParam('id');

function groupCard(g) {
  const type = g.kind || g.type || 'Club';
  const ownerBadge = Components.ownerBadge(g.role === 'owner');
  const desc = Format.truncate(g.description || '', 160);
  const eventsCount = g.events_count ?? (g.rides ? g.rides.length : null);
  const membersCount = g.members_count ?? (g.members ? g.members.length : null);
  
  const statsRow = `
    <div class="stats mt-8">
      ${Components.statCard(eventsCount, 'Événements')}
      ${Components.statCard(membersCount, 'Membres')}
    </div>`;
    
  return `
    <div class="car-card">
      <div class="car-header">
        <div><strong>${g.name}</strong> ${ownerBadge}</div>
        <div class="car-capacity text-secondary">${type}</div>
      </div>
      <div class="text-secondary">${desc || 'Aucune description'}</div>
      ${statsRow}
      ${Components.buttonRow([Components.button('Voir le club', `/club-detail.html?id=${g.id}`)])}
    </div>
  `;
}

async function loadGroups() {
  try {
    const groups = await API.get('/groups');
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
    UI.showError('Impossible de charger les clubs');
  }
}

// Creation/join sont déplacés vers club-create.html désormais

function rideRow(r) {
  return `
    <div class="car-card">
      <div class="car-header">
        <div class="car-driver">${r.title}</div>
      </div>
      <div>${Format.datetime(r.date, r.time)}</div>
      <div>${r.origin} → ${r.destination}</div>
      ${Components.buttonRow([Components.button('Voir', `/ride.html?id=${r.id}`)])}
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
    actions = `<button class="btn btn-small" data-role="${toggleTo}" data-user="${m.id}" data-group="${groupId}">${label}</button>`;
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
    const g = await API.get(`/groups/${id}`);
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
          await API.put(`/groups/${g.id}/members/${userId}`, { role });
          await loadGroupDetail(g.id);
        } catch { 
          UI.showError('Modification impossible'); 
        }
      });
    });
  } catch (e) {
    UI.showError('Groupe introuvable');
  }
}

// Fonction pour charger les trajets à venir
async function loadMyUpcoming() {
  try {
    const box = document.getElementById('myUpcoming');
    if (!box) return;
    const mine = await API.get('/my_rides');
    const now = new Date();
    const all = [].concat(mine.as_driver || [], mine.as_passenger || []);
    const upcoming = all.filter(r => {
      try { return new Date(r.date + 'T' + (r.time || '00:00')) >= now; } catch { return false; }
    }).sort((a,b)=> new Date(a.date) - new Date(b.date)).slice(0, 8);
    box.innerHTML = upcoming.length ? upcoming.map(rideItem).join('') : '<div class="secondary">Aucun trajet à venir</div>';
  } catch {}
}

function rideItem(r) {
  const when = Format.datetime(r.date, r.time);
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

// Fonctions pour le dropdown de rejoindre un groupe
function toggleJoinDropdown() {
  const dropdown = document.getElementById('joinDropdown');
  const isVisible = dropdown.classList.contains('show');
  
  if (isVisible) {
    dropdown.classList.remove('show');
  } else {
    dropdown.classList.add('show');
    setTimeout(() => {
      document.getElementById('inviteCode')?.focus();
    }, 100);
  }
}

function hideJoinDropdown() {
  const dropdown = document.getElementById('joinDropdown');
  dropdown.classList.remove('show');
  document.getElementById('joinForm')?.reset();
}

async function joinGroup(event) {
  event.preventDefault();
  const inviteCode = document.getElementById('inviteCode').value.trim();
  
  if (!inviteCode) {
    UI.showError('Veuillez entrer un code d\'invitation');
    return;
  }

  try {
    const response = await API.post('/groups/join', { invite_code: inviteCode });
    if (response.success) {
      UI.showSuccess('Vous avez rejoint le groupe avec succès !');
      hideJoinDropdown();
      loadGroups();
    } else {
      UI.showError(response.error || 'Erreur lors de l\'ajout au groupe');
    }
  } catch (error) {
    UI.showError('Erreur de connexion. Veuillez réessayer.');
  }
}

// Event listeners
document.addEventListener('click', function(event) {
  const dropdown = document.getElementById('joinDropdown');
  const button = event.target.closest('.join-dropdown');
  
  if (!button && dropdown && dropdown.classList.contains('show')) {
    hideJoinDropdown();
  }
});

// Rendre les fonctions globales pour les onclick dans le HTML
window.toggleJoinDropdown = toggleJoinDropdown;
window.joinGroup = joinGroup;

// Initialisation
if (groupIdParam) {
  loadGroupDetail(groupIdParam);
} else {
  loadGroups();
  loadMyUpcoming();
}
