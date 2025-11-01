function getUserToken() { return localStorage.getItem('userToken'); }

// ---- Render helpers (pure builders) ----
function buildMembersTable(g) {
  const rows = (g.members || []).map(m => `
    <tr>
      <td>${m.id}</td>
      <td>${m.display_name || ''}</td>
      <td>${m.first_name || ''}</td>
      <td>${m.last_name || ''}</td>
      <td>${m.role}</td>
    </tr>
  `).join('');
  return `
    <div class="table-wrap">
      <table class="table-default">
        <thead>
          <tr>
            <th class="th-cell">ID</th>
            <th class="th-cell">Pseudo</th>
            <th class="th-cell">Prénom</th>
            <th class="th-cell">Nom</th>
            <th class="th-cell">Rôle</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="5" class="td-empty">Aucun membre</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

function buildRidesTable(g) {
  const rows = (g.rides || []).map(r => `
    <tr>
      <td>${r.title || ''}</td>
      <td>${r.date || ''}</td>
      <td>${r.time || ''}</td>
      <td>${r.origin || ''}</td>
      <td>${r.destination || ''}</td>
      <td>${r.drivers_count != null ? r.drivers_count : ''}</td>
      <td>${r.passengers_count != null ? r.passengers_count : ''}</td>
    </tr>
  `).join('');
  return `
    <div class="table-wrap">
      <table class="table-default">
        <thead>
          <tr>
            <th class="th-cell">Titre</th>
            <th class="th-cell">Date</th>
            <th class="th-cell">Heure</th>
            <th class="th-cell">Départ</th>
            <th class="th-cell">Destination</th>
            <th class="th-cell">Conducteurs</th>
            <th class="th-cell">Passagers</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="7" class="td-empty">Aucun événement</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

function buildStatsBlock(g, upcoming) {
  return `
    <div class="stats">
      <div class="stat-card"><div class="stat-number">${(g.rides || []).length}</div><div class="stat-label">Total événements</div></div>
      <div class="stat-card"><div class="stat-number">${upcoming.length}</div><div class="stat-label">À venir</div></div>
      <div class="stat-card"><div class="stat-number">${g.members_count != null ? g.members_count : (g.members ? g.members.length : '-')}</div><div class="stat-label">Membres</div></div>
    </div>`;
}

function buildInviteBox(invite_code) {
  if (!invite_code) return '<div class="secondary">Aucun code d\'invitation disponible</div>';
  const inviteUrl = `${location.origin}/clubs.html?invite=${encodeURIComponent(invite_code)}`;
  return `
    <div class="link-box">
      <input id="inviteLinkInput" value="${invite_code}" readonly />
      <button id="copyInviteLink" class="btn btn-small">📋 Copier le code</button>
      <button id="copyInviteUrl" class="btn btn-small">🔗 Copier le lien</button>
    </div>`;
}
// Remove any legacy "Quitter le club" buttons that might be left by cached code
function removeLegacyLeaveButtons(root = document) {
  root.querySelectorAll('#leaveGroupBtn, button, a').forEach(el => {
    if (el.id === 'leaveGroupBtn') { el.remove(); return; }
    const txt = (el.textContent || '').trim().toLowerCase();
    if (txt === 'quitter le club') el.remove();
  });
}
if (!getUserToken()) { window.location.href = '/index.html'; }

async function fetchJSON(url, options = {}) {
  const headers = options.headers || {};
  headers['X-User-Token'] = getUserToken();
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    try {
      const data = await res.json();
      if (data && (data.error || data.message)) msg = data.error || data.message;
    } catch { try { msg = await res.text(); } catch {} }
    throw new Error(msg);
  }
  try { return await res.json(); } catch { return null; }
}

function setLoading(el, on) {
  if (!el) return;
  el.disabled = !!on;
  if (on) {
    el.dataset._label = el.textContent;
    el.textContent = '…';
  } else if (el.dataset._label) {
    el.textContent = el.dataset._label;
    delete el.dataset._label;
  }
}

// Lightweight toast notifications
function showToast(message, kind = 'info') {
  let box = document.getElementById('toastContainer');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toastContainer';
    box.style.position = 'fixed';
    box.style.right = '20px';
    box.style.bottom = '20px';
    box.style.zIndex = '1000';
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.gap = '8px';
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.textContent = message;
  el.style.background = kind === 'error' ? '#fee2e2' : '#eef2ff';
  el.style.border = '1px solid ' + (kind === 'error' ? '#fecaca' : '#c7d2fe');
  el.style.color = kind === 'error' ? '#991b1b' : '#1e3a8a';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '8px';
  el.style.boxShadow = '0 4px 12px rgba(0,0,0,.12)';
  box.appendChild(el);
  setTimeout(() => { el.remove(); if (!box.children.length) box.remove(); }, 2500);
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('userToken');
  window.location.href = '/index.html';
});

const params = new URLSearchParams(location.search);
const groupIdParam = params.get('id') || (window.groupId ? String(window.groupId) : null);
const groupDetail = document.getElementById('groupDetail');
let currentGroupId = null;

function rideRow(r, gid) {
  const dt = new Date(r.date + 'T' + (r.time || '00:00'));
  const drivers = r.drivers_count != null ? r.drivers_count : (Array.isArray(r.drivers) ? r.drivers.length : '-');
  const passengers = r.passengers_count != null ? r.passengers_count : (Array.isArray(r.passengers) ? r.passengers.length : '-');
  const seats = r.seats_taken != null ? r.seats_taken : '-';
  return `
    <div class="car-card">
      <div class="car-header">
        <div class="car-driver">${r.title}</div>
      </div>
      <div>📍 ${r.origin} → ${r.destination}</div>
      <div>🗓️ ${dt.toLocaleDateString('fr-FR')}${r.time ? ' à ' + r.time : ''}</div>
      <div class="stats" style="margin-top:8px;">
        <div class="stat-card"><div class="stat-number">${drivers}</div><div class="stat-label">Conducteurs</div></div>
        <div class="stat-card"><div class="stat-number">${passengers}</div><div class="stat-label">Passagers</div></div>
        <div class="stat-card"><div class="stat-number">${seats}</div><div class="stat-label">Places réservées</div></div>
      </div>
      <div style="margin-top:8px;display:flex;gap:8px;">
        <a class="btn btn-small" href="/event-detail.html?clubId=${gid}&eventId=${r.id}">Voir l'événement</a>
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
    actions = `<button class="btn btn-small" data-role="${toggleTo}" data-user="${m.id}" data-group="${groupId}">${label}</button>`;
  }
  return `
    <div class="car-card items-center">
      <div class="car-header">
        <div class="row items-center gap-8">
          ${avatar}
          <div>${name}</div>
        </div>
        <div class="car-capacity ${m.role === 'owner' ? 'owner' : ''}">${m.role === 'owner' ? 'Propriétaire' : 'Membre'}</div>
      </div>
      <div class="mt-8">${actions}</div>
    </div>
  `;
}

async function loadGroupDetail(id) {
  try {
    const g = await fetchJSON(`/api/v1/groups/${id}`);
    currentGroupId = g.id;
    if (groupDetail) groupDetail.style.display = 'block';

    // Split rides upcoming/past
    const now = new Date();
    const upcoming = [];
    const past = [];
    (g.rides || []).forEach(r => {
      const dt = new Date(r.date + 'T' + (r.time || '00:00'));
      (dt >= now ? upcoming : past).push(r);
    });

    const typeBadge = `<span class="car-capacity">${g.kind || g.type || 'Club'}</span>`;
    const inviteUrl = g.invite_code ? `${location.origin}/clubs.html?invite=${encodeURIComponent(g.invite_code)}` : '';
    const inviteBox = g.invite_code ? `
      <div class="link-box">
        <input id="inviteLinkInput" value="${g.invite_code}" readonly />
        <button id="copyInviteLink" class="btn btn-small">📋 Copier le code</button>
        <button id="copyInviteUrl" class="btn btn-small">🔗 Copier le lien</button>
      </div>` : '';
    const stats = buildStatsBlock(g, upcoming);

    const isOwner = g.role === 'owner';

    // Build detailed members table
    const membersTable = buildMembersTable(g);

    // Build detailed events table
    const ridesTable = buildRidesTable(g);

    groupDetail.innerHTML = `
      <div class="card">
        <div class="car-header">
          <div><h2 class="m-0">${g.name}</h2></div>
          ${typeBadge}
        </div>
        <p>${g.description || ''}</p>
        <div class="actions-row mt-8">
          <a class="btn" href="/event-create.html?clubId=${g.id}">➕ Créer un événement</a>
          ${isOwner ? `<button id="editGroupBtn" class="btn btn-secondary">Modifier</button>` : ''}
          ${isOwner ? `<button id="deleteGroupBtn" class="btn btn-danger">Supprimer</button>` : ''}
        </div>
      </div>

      <div class="card">
        <h3>Infos du club</h3>
        <div class="form-grid">
          <div class="form-group"><label>ID</label><div>${g.id}</div></div>
          <div class="form-group"><label>Nom</label><div>${g.name}</div></div>
          <div class="form-group"><label>Description</label><div>${g.description || ''}</div></div>
          <div class="form-group"><label>Type</label><div>${g.kind || ''}</div></div>
          <div class="form-group"><label>Votre rôle</label><div>${g.role}</div></div>
          <div class="form-group"><label>Code d'invitation</label><div>${g.invite_code || '—'}</div></div>
          <div class="form-group"><label>Nombre de membres</label><div>${g.members_count != null ? g.members_count : (g.members ? g.members.length : '—')}</div></div>
        </div>
      </div>

      <div class="card">
        <h3>Inviter des membres</h3>
        ${buildInviteBox(g.invite_code)}
        <div class="actions-row mt-8">
          <input id="addMemberEmail" type="email" placeholder="Email du membre" class="flex-1 min-w-220" />
          <button id="addMemberBtn" class="btn btn-small">Ajouter</button>
        </div>
      </div>

      <div class="card">
        <h3>Statistiques</h3>
        ${stats}
      </div>

      <div class="card">
        <h3>Événements</h3>
        <div class="section-header-row">
          <div class="secondary">Gestion des événements du club</div>
          <a class="btn btn-small" href="/event-create.html?clubId=${g.id}">Créer un événement</a>
        </div>
        <h4>À venir</h4>
        <div id="groupUpcoming">${upcoming.map(r => rideRow(r, g.id)).join('') || '<div class="secondary">Aucun événement à venir</div>'}</div>
        ${past.length ? `<h4 class=\"mt-16\">Passés</h4><div id=\"groupPast\">${past.map(r => rideRow(r, g.id)).join('')}</div>` : ''}
        <h4 class="mt-16">Détails</h4>
        ${ridesTable}
      </div>

      <div class="card">
        <h3>Membres</h3>
        <div id="groupMembers">${(g.members || []).slice().sort((a,b)=> (a.role==='owner'?-1:1)).map(m => memberCard(m, g.role === 'owner', g.id)).join('')}</div>
        <h4 style="margin-top:16px;">Détails</h4>
        ${membersTable}
      </div>

      ${true ? `
      <!-- Edit Group Dialog -->
      <dialog id="editGroupDialog">
        <form method="dialog" id="editGroupForm" class="form">
          <h3>Modifier le club</h3>
          <div class="form-group">
            <label for="eg_name">Nom</label>
            <input id="eg_name" value="${g.name}" required />
          </div>
          <div class="form-group">
            <label for="eg_desc">Description</label>
            <textarea id="eg_desc">${g.description || ''}</textarea>
          </div>
          <div class="nav modal-actions">
            <button type="button" class="btn btn-secondary" id="editGroupCancel">Annuler</button>
            <button class="btn" type="submit">Enregistrer</button>
          </div>
        </form>
      </dialog>

      <!-- Add Member Dialog -->
      <dialog id="addMemberDialog">
        <form method="dialog" id="addMemberForm" class="form">
          <h3>Ajouter un membre</h3>
          <div class="form-group">
            <label for="am_email">Email *</label>
            <input id="am_email" type="email" placeholder="email@exemple.com" required />
          </div>
          <div class="nav modal-actions">
            <button type="button" class="btn btn-secondary" id="addMemberCancel">Annuler</button>
            <button class="btn" type="submit">Ajouter</button>
          </div>
        </form>
      </dialog>

      <!-- Delete Group Dialog -->
      <dialog id="deleteGroupDialog">
        <form method="dialog" id="deleteGroupForm" class="form">
          <h3>Supprimer le club</h3>
          <p class="secondary">Tapez le nom du club pour confirmer&nbsp;: <strong>${g.name}</strong></p>
          <div class="form-group">
            <input id="dg_confirm" placeholder="Nom du club" />
          </div>
          <div class="nav modal-actions">
            <button type="button" class="btn btn-secondary" id="deleteGroupCancel">Annuler</button>
            <button class="btn btn-danger" type="submit">Supprimer</button>
          </div>
        </form>
      </dialog>
      ` : ''}
    `;

    // Bind leave
    // Copy invite code
    document.getElementById('copyInviteLink')?.addEventListener('click', async () => {
      try {
        const el = document.getElementById('inviteLinkInput');
        if (el && el.value) { await navigator.clipboard.writeText(el.value); showToast('Code copié'); }
      } catch {}
    });
    document.getElementById('copyInviteUrl')?.addEventListener('click', async () => {
      try { if (inviteUrl) { await navigator.clipboard.writeText(inviteUrl); showToast('Lien copié'); } } catch {}
    });

    // Bind owner actions: edit, delete, add member
    if (isOwner) {
      // Edit dialog
      const editBtn = document.getElementById('editGroupBtn');
      const editDialog = document.getElementById('editGroupDialog');
      const editForm = document.getElementById('editGroupForm');
      const editCancel = document.getElementById('editGroupCancel');
      editBtn?.addEventListener('click', () => editDialog?.showModal());
      editCancel?.addEventListener('click', () => editDialog?.close());
      editForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('eg_name').value.trim();
        const description = document.getElementById('eg_desc').value.trim();
        const submitBtn = editForm.querySelector('button[type="submit"]');
        try {
          setLoading(submitBtn, true);
          await fetchJSON(`/api/v1/groups/${g.id}`, { method: 'PATCH', body: JSON.stringify({ name, description }) });
          editDialog?.close();
          showToast('Club mis à jour');
          await loadGroupDetail(g.id);
        } catch (err) { showToast(err.message || 'Modification impossible', 'error'); }
        finally { setLoading(submitBtn, false); }
      });

      // Delete dialog
      const delBtn = document.getElementById('deleteGroupBtn');
      const delDialog = document.getElementById('deleteGroupDialog');
      const delForm = document.getElementById('deleteGroupForm');
      const delCancel = document.getElementById('deleteGroupCancel');
      delBtn?.addEventListener('click', () => delDialog?.showModal());
      delCancel?.addEventListener('click', () => delDialog?.close());
      delForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const val = document.getElementById('dg_confirm').value.trim();
        if (val !== g.name) { alert('Le nom ne correspond pas.'); return; }
        const submitBtn = delForm.querySelector('button[type="submit"]');
        try {
          setLoading(submitBtn, true);
          await fetchJSON(`/api/v1/groups/${g.id}`, { method: 'DELETE' });
          delDialog?.close();
          showToast('Club supprimé');
          location.href = '/clubs.html';
        } catch (err) { showToast(err.message || 'Suppression impossible', 'error'); }
        finally { setLoading(submitBtn, false); }
      });

    }

    // Add member dialog (available to all members)
    const addBtn = document.getElementById('addMemberBtn');
    const addDialog = document.getElementById('addMemberDialog');
    const addForm = document.getElementById('addMemberForm');
    const addCancel = document.getElementById('addMemberCancel');
    addBtn?.addEventListener('click', () => addDialog?.showModal());
    addCancel?.addEventListener('click', () => addDialog?.close());
    addForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('am_email').value.trim();
      if (!email) { alert('Entrez un email'); return; }
      const submitBtn = addForm.querySelector('button[type="submit"]');
      try {
        setLoading(submitBtn, true);
        await fetchJSON(`/api/v1/groups/${g.id}/members`, { method: 'POST', body: JSON.stringify({ email }) });
        addDialog?.close();
        showToast('Membre ajouté');
        await loadGroupDetail(g.id);
      } catch (err) { showToast(err.message || 'Ajout impossible', 'error'); }
      finally { setLoading(submitBtn, false); }
    });

    // (removed old container-level binding)

    // Bind promote/demote
    document.querySelectorAll('#groupMembers [data-user]')?.forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.getAttribute('data-user');
        const role = btn.getAttribute('data-role');
        if (!confirm('Confirmer la modification du rôle ?')) return;
        setLoading(btn, true);
        try {
          await fetchJSON(`/api/v1/groups/${g.id}/members/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify({ role })
          });
          showToast('Rôle mis à jour');
          await loadGroupDetail(g.id);
        } catch (err) { showToast(err.message || 'Modification impossible', 'error'); }
        finally { setLoading(btn, false); }
      });
    });
  } catch (e) {
    alert('Groupe introuvable');
    location.href = '/clubs.html';
  }
}

if (groupIdParam) {
  loadGroupDetail(groupIdParam);
} else {
  location.href = '/clubs.html';
}
