function getUserToken() { return localStorage.getItem('userToken'); }
if (!getUserToken()) { window.location.href = '/index.html'; }

async function fetchJSON(url, options = {}) {
  const headers = options.headers || {};
  headers['X-User-Token'] = getUserToken();
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

const params = new URLSearchParams(location.search);
const clubId = params.get('clubId');

// Context: show club name and set Back link
(async () => {
  const back = document.getElementById('backToClub');
  if (clubId && back) back.href = `/club-detail.html?id=${encodeURIComponent(clubId)}`;
  const ctx = document.getElementById('clubContext');
  if (!clubId) return;
  try {
    const g = await fetchJSON(`/api/v1/groups/${clubId}`);
    if (ctx) { ctx.style.display = 'block'; ctx.innerHTML = `Événement pour le club <strong>${g.name}</strong>.`; }
  } catch {}
})();

// Init Mapbox Geocoder for destination autocomplete
try {
  if (window.__MAPBOX_TOKEN && window.mapboxgl && window.MapboxGeocoder) {
    mapboxgl.accessToken = window.__MAPBOX_TOKEN;
    const g = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl,
      placeholder: "Rechercher la destination",
      marker: false,
      language: 'fr',
      types: 'poi,place,address',
      countries: (window.__MAPBOX_COUNTRIES || 'be,fr')
    });
    const box = document.getElementById('evPlaceGeocoder');
    if (box) {
      g.addTo(box);
      g.on('result', (e) => {
        const feat = e.result;
        const label = feat && (feat.place_name || feat.text) || '';
        const input = document.getElementById('ev_place');
        if (input) { input.value = label; updatePreview(); }
      });
    }
  }
} catch {}

// Live preview
const pvTitle = document.getElementById('previewTitle');
const pvSub = document.getElementById('previewSub');
const pvIcon = document.getElementById('previewIcon');
const elName = document.getElementById('ev_name');
const elDate = document.getElementById('ev_date');
const elTime = document.getElementById('ev_time');
const elPlace = document.getElementById('ev_place');
const elColor = document.getElementById('ev_color');
const elIconUrl = document.getElementById('ev_icon');
const elIconSel = document.getElementById('ev_icon_select');

function updatePreview() {
  try {
    const title = (elName?.value || '').trim() || 'Nom de l\'événement';
    const date = (elDate?.value || '').trim();
    const time = (elTime?.value || '').trim();
    const place = (elPlace?.value || '').trim();
    const color = (elColor?.value || '').trim() || '#2563eb';
    const url = (elIconUrl?.value || '').trim();
    const sel = (elIconSel?.value || '').trim();
    const icon = url || sel;
    if (pvTitle) pvTitle.textContent = title;
    if (pvSub) pvSub.textContent = [date, time].filter(Boolean).join(' ') + (place ? (date||time ? ' • ' : '') + place : '');
    if (pvIcon) {
      pvIcon.style.background = color + '22';
      pvIcon.style.borderColor = color + '66';
      pvIcon.innerHTML = icon ? `<img alt="icon" src="${icon}"/>` : '<span class="placeholder">🛈</span>';
    }
  } catch {}
}

[elName, elDate, elTime, elPlace, elColor, elIconUrl, elIconSel].forEach(el => {
  try { el && el.addEventListener('input', updatePreview); } catch {}
  try { el && el.addEventListener('change', updatePreview); } catch {}
});
setTimeout(updatePreview, 0);

const form = document.getElementById('eventCreateForm');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('ev_name').value.trim();
  const date = document.getElementById('ev_date').value;
  const time = document.getElementById('ev_time').value;
  const place = document.getElementById('ev_place').value.trim();
  const note = document.getElementById('ev_desc').value.trim();
  const color = (document.getElementById('ev_color')?.value || '').trim();
  const icon_url_input = (document.getElementById('ev_icon')?.value || '').trim();
  const icon_url_select = (document.getElementById('ev_icon_select')?.value || '').trim();
  const icon_url = icon_url_input || icon_url_select || '';

  if (!title || !date || !place) {
    alert('Champs requis manquants');
    return;
  }

  try {
    // Map event fields to rides payload
    const payload = {
      title,
      date,
      time,
      destination: place,
      seats_total: 4,
      note,
      group_id: clubId ? parseInt(clubId, 10) : null,
      color: color || undefined,
      icon_url: icon_url || undefined
    };
    const data = await fetchJSON('/api/v1/rides', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const newId = data?.id;
    if (newId) {
      window.location.href = `/event-detail.html?clubId=${encodeURIComponent(clubId || '')}&eventId=${encodeURIComponent(newId)}`;
      return;
    }
    alert('Événement créé, redirection vers la liste');
    window.location.href = `/club-detail.html?id=${encodeURIComponent(clubId || '')}`;
  } catch (e) {
    alert('Erreur lors de la création');
  }
});
