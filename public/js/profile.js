function getUserToken() { return localStorage.getItem('userToken'); }

async function isDisplayNameUnique(name) {
  if (!name) return true;
  try {
    const res = await fetch(`/api/v1/users/unique?display_name=${encodeURIComponent(name)}`, { headers: { 'X-User-Token': getUserToken() } });
    if (!res.ok) return true; // skip precheck if endpoint not supported
    const data = await res.json().catch(() => ({}));
    if (typeof data.unique === 'boolean') return data.unique;
    if (typeof data.exists === 'boolean') return !data.exists;
    return true;
  } catch { return true; }
}
if (!getUserToken()) { window.location.href = '/index.html'; }

async function fetchJSON(url, options = {}) {
  const headers = options.headers || {};
  headers['X-User-Token'] = getUserToken();
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('userToken');
  window.location.href = '/index.html';
});

const form = document.getElementById('profileForm');
const avatar = document.getElementById('avatarPreview');
const displayName = document.getElementById('display_name');
const firstName = document.getElementById('first_name');
const lastName = document.getElementById('last_name');
const emailEl = document.getElementById('email');
const telephoneEl = document.getElementById('telephone');
const carType = document.getElementById('car_type');
const seatsAvailable = document.getElementById('seats_available');
const avatarUrl = document.getElementById('avatar_url');
const avatarFile = document.getElementById('avatar_file');
let avatarDirty = false; // user has changed avatar locally

avatarUrl.addEventListener('input', () => {
  const v = avatarUrl.value.trim();
  avatar.src = v || '';
  avatarDirty = true;
});

// When user selects a local image, preview it and store as data URL into avatar_url
if (avatarFile) {
  avatarFile.addEventListener('change', () => {
    const file = avatarFile.files && avatarFile.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Veuillez sélectionner une image'); return; }
    // Optional: basic size guard (5MB)
    if (file.size > 5 * 1024 * 1024) { alert('Image trop lourde (max 5 Mo)'); return; }
    // Instant preview via Object URL (more robust for large files and unusual formats)
    try {
      const objUrl = URL.createObjectURL(file);
      avatar.onerror = () => { /* fallback will set dataURL below */ };
      avatar.onload = () => { try { URL.revokeObjectURL(objUrl); } catch {} };
      avatar.src = objUrl;
    } catch {}
    avatarDirty = true;

    // Also store a Data URL in the hidden text field so it can be persisted server-side
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (avatarUrl) avatarUrl.value = dataUrl; // backend will receive it as avatar_url
      // If object URL preview failed (rare), ensure preview shows the data URL
      if (!avatar.src || avatar.src.startsWith('blob:') === false) {
        avatar.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  });
}

(async () => {
  try {
    const upcomingBox = document.getElementById('myUpcomingProfile');
    const me = await fetchJSON('/api/v1/me');
    displayName.value = me.display_name || '';
    firstName.value = me.first_name || '';
    lastName.value = me.last_name || '';
    if (emailEl) emailEl.value = me.email || '';
    if (telephoneEl) telephoneEl.value = me.telephone || '';
    carType.value = me.car_type || '';
    if (seatsAvailable) seatsAvailable.value = (me.seats_available != null && me.seats_available !== '') ? String(me.seats_available) : '';
    if (!avatarDirty) {
      avatarUrl.value = me.avatar_url || '';
      avatar.src = me.avatar_url || '';
    }
  } catch (e) {
    alert('Impossible de charger votre profil');
  }
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    // Ensure unique pseudo if changed
    const dn = displayName.value.trim();
    if (dn) {
      const meNow = await fetchJSON('/api/v1/me').catch(() => ({}));
      if (!meNow || !meNow.display_name || meNow.display_name !== dn) {
        const unique = await isDisplayNameUnique(dn);
        if (!unique) throw new Error('Ce pseudo est déjà pris, veuillez en choisir un autre');
      }
    }
    const payload = {
      display_name: dn,
      first_name: firstName.value.trim(),
      last_name: lastName.value.trim(),
      telephone: telephoneEl ? telephoneEl.value.trim() : '',
      car_type: carType.value.trim(),
      seats_available: seatsAvailable && seatsAvailable.value ? parseInt(seatsAvailable.value, 10) : null,
      avatar_url: avatarUrl.value.trim()
    };
    await fetchJSON('/api/v1/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    alert('Profil mis à jour');
  } catch (e) {
    alert('Mise à jour impossible');
  }
});

// Render helpers
function pick(...vals) { return vals.find(v => v != null && v !== '') }
function asDate(val) { try { const d = new Date(val); return isNaN(d) ? null : d; } catch { return null; } }
function rideDateTime(r) {
  // Accept multiple backend shapes
  const isoStart = pick(r.start_at, r.starts_at, r.startAt);
  const iso = isoStart && asDate(isoStart);
  if (iso) return iso;
  const dRaw = pick(r.date, r.ride_date, r.start_date, r.day, r.when);
  const tRaw = pick(r.time, r.start_time, r.hour);
  // Try build ISO-like string first
  if (dRaw) {
    const base = String(dRaw).includes('T') ? dRaw : `${dRaw}T${tRaw || '00:00'}`;
    const built = asDate(base);
    if (built) return built;
  }
  // Last resort: any parseable field
  const any = pick(r.datetime, r.created_at, r.updated_at);
  return any ? asDate(any) : null;
}
function groupCard(g) {
  return `
    <div class="car-card">
      <div class="car-header">
        <div class="car-driver">${g.name}</div>
        ${g.role ? `<div class=\"car-capacity\">${g.role}</div>` : ''}
      </div>
      <div>${g.description || ''}</div>
      <div class="btn-row">
        <a class="btn btn-small" href="/club-detail.html?id=${g.id}">Ouvrir</a>
        <a class="btn btn-small" href="/create.html?group_id=${g.id}">Créer un covoiturage</a>
      </div>
    </div>
  `;
}

function rideSmallCard(r) {
  return `
    <div class="car-card">
      <div class="car-header">
        <div class="car-driver">${r.title}</div>
      </div>
      <div>${(rideDateTime(r) || new Date()).toLocaleDateString('fr-FR')}${r.time ? ' à ' + r.time : ''}</div>
      <div>${r.origin || ''}${r.destination ? ' → ' + r.destination : ''}</div>
      <div class="mt-8"><a class="btn btn-small" href="/event-detail.html?eventId=${r.id}">Ouvrir</a></div>
    </div>
  `;
}

// Load groups and my rides for profile
(async () => {
  try {
    const upcomingBox = document.getElementById('myUpcomingProfile');
    const groupsEl = document.getElementById('groupsListProfile');
    if (groupsEl) {
      try {
        const groups = await fetchJSON('/api/v1/groups');
        groupsEl.innerHTML = groups.map(groupCard).join('') || '<div class="secondary">Aucun groupe</div>';
      } catch {
        if (upcomingBox) {
          upcomingBox.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon">🚗</div>
              <div class="empty-title">Aucun trajet prévu</div>
              <div class="empty-sub">Vos prochains covoiturages apparaîtront ici</div>
            </div>
          `;
        }
      }
    }

    const asDriverEl = document.getElementById('asDriverListProfile');
    const asPassengerEl = document.getElementById('asPassengerListProfile');
    try {
      // 1) Try dedicated endpoint for upcoming rides
      let list = [];
      try {
        const up = await fetchJSON('/api/v1/my_upcoming_rides');
        const items = Array.isArray(up) ? up : (Array.isArray(up?.rides) ? up.rides : []);
        list = (items || []).slice();
      } catch {}

      // 2) Fallback to my_rides + filtering
      if (!list.length) {
        const mine = await fetchJSON('/api/v1/my_rides');
        const now = new Date();
        const all = ([]).concat(mine.as_driver || [], mine.as_passenger || [], mine.rides || []);
        list = all
          .map(r => ({ ...r, __dt: rideDateTime(r) }))
          .filter(r => r.__dt && r.__dt >= now)
          .sort((a,b)=> a.__dt - b.__dt);
      }

      // 3) If still empty: add rides created by me across my groups
      if (!list.length) {
        try {
          const me = await fetchJSON('/api/v1/me');
          const groups = await fetchJSON('/api/v1/groups');
          const created = [];
          const now = new Date();
          (groups || []).forEach(g => {
            (g.rides || []).forEach(r => {
              const creatorId = r.created_by_id || r.creator_id || r.user_id || r.owner_id || r.ownerId || r.createdById || r.author_id || r.authorId;
              const isMine = me && creatorId && String(creatorId) === String(me.id);
              const dt = rideDateTime(r);
              const isFuture = dt && dt >= now;
              if (isMine && isFuture) created.push(r);
            });
          });
          if (created.length) list = created
            .map(r => ({ ...r, __dt: rideDateTime(r) }))
            .filter(r => r.__dt)
            .sort((a,b)=> a.__dt - b.__dt);
        } catch {}
      }

      if (upcomingBox) {
        if (list.length) {
          // Normalize minimal fields to avoid undefined
          const html = list.map(r => rideSmallCard({
            id: r.id,
            title: r.title || r.name || 'Événement',
            date: r.date || r.ride_date || r.start_date,
            time: r.time || r.start_time,
            origin: r.origin || r.pickup_address || r.address || '',
            destination: r.destination || r.place || ''
          })).join('');
          upcomingBox.innerHTML = html;
        } else {
          upcomingBox.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon">🚗</div>
              <div class="empty-title">Aucun trajet prévu</div>
              <div class="empty-sub">Vos prochains covoiturages apparaîtront ici</div>
            </div>
          `;
        }
      }
    } catch {}
  } catch {}
})();

// Tabs: Info, Clubs, Stats
document.addEventListener('DOMContentLoaded', () => {
  const tabs = Array.from(document.querySelectorAll('.tabs .tab'));
  const infoSection = document.querySelector('.form-section[data-section="info"]');
  const statsSection = document.querySelector('.form-section.stats-section[data-section="stats"]');
  const groupsList = document.getElementById('groupsListProfile');
  const clubsSection = groupsList ? groupsList.closest('.form-section') : null;

  const sections = [infoSection, clubsSection, statsSection].filter(Boolean);

  function showSection(idx) {
    sections.forEach((sec, i) => {
      if (!sec) return;
      sec.style.display = i === idx ? '' : 'none';
    });
    tabs.forEach((t, i) => t.classList.toggle('active', i === idx));
  }

  if (tabs.length && sections.length) {
    // Default to first tab (Info)
    showSection(0);
    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => showSection(idx));
    });
  }
});

// Populate basic stats if elements exist
(async () => {
  try {
    const tripsEl = document.getElementById('statTrips');
    const clubsEl = document.getElementById('statClubs');
    const driverTimesEl = document.getElementById('statDriverTimes');
    const kmEl = document.getElementById('statKm');
    if (!tripsEl && !clubsEl && !driverTimesEl && !kmEl) return;

    let clubsCount = null;
    try {
      const groups = await fetchJSON('/api/v1/groups');
      clubsCount = Array.isArray(groups) ? groups.length : null;
      if (clubsEl && clubsCount !== null) clubsEl.textContent = String(clubsCount);
    } catch {}

    try {
      const mine = await fetchJSON('/api/v1/my_rides');
      const asDriver = Array.isArray(mine?.as_driver) ? mine.as_driver.length : 0;
      const asPassenger = Array.isArray(mine?.as_passenger) ? mine.as_passenger.length : 0;
      const total = asDriver + asPassenger;
      if (tripsEl) tripsEl.textContent = String(total);
      if (driverTimesEl) driverTimesEl.textContent = String(asDriver);
      // If backend provides km stats in future, fill here
      if (kmEl && typeof mine?.km_saved === 'number') kmEl.textContent = String(mine.km_saved);
    } catch {}
  } catch {}
})();
