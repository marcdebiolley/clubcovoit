function getUserToken() { return localStorage.getItem('userToken'); }
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

function rideCard(ride) {
  const seatsInfo = `${ride.seats_taken}/${ride.seats_total} places`;
  return `
    <div class="car-card">
      <div class="car-header">
        <div class="car-driver">${ride.title}</div>
        <div class="car-capacity">${seatsInfo}</div>
      </div>
      <div>${new Date(ride.date).toLocaleDateString('fr-FR')}${ride.time ? ' à ' + ride.time : ''}</div>
      <div>${ride.origin} → ${ride.destination}</div>
      <div class="mt-8"><a class="btn btn-small" href="/ride.html?id=${ride.id}">Ouvrir</a></div>
    </div>
  `;
}

function groupCard(g) {
  const actions = `
    <div class="btn-row">
      <a class="btn btn-small" href="/club-detail.html?id=${g.id}">Ouvrir le club</a>
      <a class="btn btn-small" href="/create.html?group_id=${g.id}">Créer un covoiturage</a>
    </div>
  `;
  return `
    <div class="car-card">
      <div class="car-header">
        <div class="car-driver">${g.name}</div>
        ${g.role ? `<div class="car-capacity">${g.role}</div>` : ''}
      </div>
      <div>${g.description || ''}</div>
      ${actions}
    </div>
  `;
}

(async () => {
  try {
    // Load groups for homepage
    const groupsListEl = document.getElementById('groupsListHome');
    if (groupsListEl) {
      try {
        const groups = await fetchJSON('/api/v1/groups');
        groupsListEl.innerHTML = groups.map(groupCard).join('') || '<div class="secondary">Vous ne faites partie d\'aucun groupe pour le moment.</div>';
      } catch {}
    }

    // Load my rides (driver/passenger)
    const driverEl = document.getElementById('asDriverList');
    const passengerEl = document.getElementById('asPassengerList');
    if (driverEl && passengerEl) {
      try {
        const mine = await fetchJSON('/api/v1/my_rides');
        const smallCard = (r) => `
          <div class="car-card">
            <div class="car-header">
              <div class="car-driver">${r.title}</div>
            </div>
            <div>${new Date(r.date).toLocaleDateString('fr-FR')}${r.time ? ' à ' + r.time : ''}</div>
            <div>${r.origin} → ${r.destination}</div>
            <div class="mt-8"><a class="btn btn-small" href="/ride.html?id=${r.id}">Ouvrir</a></div>
          </div>
        `;
        driverEl.innerHTML = (mine.as_driver || []).map(smallCard).join('') || '<div class="secondary">Aucun trajet à venir</div>';
        passengerEl.innerHTML = (mine.as_passenger || []).map(smallCard).join('') || '<div class="secondary">Aucun trajet à venir</div>';
      } catch {}
    }

    const rides = await fetchJSON('/api/v1/rides');
    const list = document.getElementById('ridesList');
    list.innerHTML = rides.map(rideCard).join('');
  } catch (e) {
    alert('Impossible de charger les covoiturages');
  }
})();
