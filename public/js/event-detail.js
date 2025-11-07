function getUserToken() { return localStorage.getItem('userToken'); }

// Destination marker reference
let __destMarker = null;
let __destLngLat = null;

// Show destination marker (arrival address) on the event map
async function showDestinationOnMap(address, color) {
  try {
    if (!address) return;
    ensureEventMap();
    if (!evMap) return;
    if (!evMapReady) await new Promise(res => evMap.once('load', () => { evMapReady = true; res(); }));

    // Geocode destination if no coords known
    let pos = null;
    try { pos = await geocodeWithMapbox(address); } catch {}
    if (!pos) return;

    // Remove old marker if any
    try { if (__destMarker) { __destMarker.remove(); __destMarker = null; } } catch {}

    // Create a custom DOM marker with a Font Awesome flag icon
    const el = document.createElement('div');
    el.className = 'dest-flag';
    el.title = address;
    el.innerHTML = '<i class="fa-solid fa-flag"></i>';
    if (color && /^#?[0-9a-fA-F]{3,8}$/.test(String(color))) {
      try {
        var c = color.startsWith('#') ? color : ('#' + color);
        el.style.setProperty('--dest-flag-color', c);
      } catch {}
    }
    __destMarker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([pos.lng, pos.lat])
      .setPopup(new mapboxgl.Popup({ offset: 18 }).setText(address))
      .addTo(evMap);
    __destLngLat = [pos.lng, pos.lat];

    // Fit bounds to include cars and destination
    try {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([pos.lng, pos.lat]);
      const carsSrc = evMap.getSource('ev-cars');
      if (carsSrc && carsSrc._data && carsSrc._data.features) {
        (carsSrc._data.features || []).forEach(f => {
          if (f && f.geometry && f.geometry.coordinates) bounds.extend(f.geometry.coordinates);
        });
      }
      evMap.fitBounds(bounds, { padding: 48, maxZoom: 13 });
    } catch {}
  } catch {}
}

// Open booking dialog for a specific car (reuses existing booking flow)
async function openBookingForCar(cid) {
  if (!cid) return;
  try {
    bookCarId = parseInt(cid, 10);
    try {
      const me = await fetchJSON('/api/v1/me');
      if (bookName) bookName.value = (me.display_name || `${me.first_name || ''} ${me.last_name || ''}`.trim() || '').trim();
    } catch {}
    bookDialog?.showModal();
  } catch {}
}

// Deterministic color per car (fallback when API doesn't provide car.color)
function colorForCar(id) {
  const palette = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0ea5e9', '#16a34a', '#f59e0b', '#ef4444', '#9333ea'];
  const n = Math.abs(parseInt(id, 10) || 0);
  return palette[n % palette.length];
}

let __carMarkers = [];
async function renderCarsOnMap(cars) {
  try {
    ensureEventMap();
    if (!evMap) return;
    if (!evMapReady) await new Promise(res => evMap.once('load', () => { evMapReady = true; res(); }));

    const features = [];
    const colorsToLoad = new Set();
    const bounds = new mapboxgl.LngLatBounds();
    for (const car of (cars || [])) {
      if (!car) continue;
      let lng = car.longitude != null ? Number(car.longitude) : null;
      let lat = car.latitude != null ? Number(car.latitude) : null;
      const addrCandidate = car.__addrDisplay || car.pickup_address || car.origin || car.departure || car.departure_address || car.address || car.location || car.start_address;
      if ((!Number.isFinite(lng) || !Number.isFinite(lat)) && window.__MAPBOX_TOKEN && addrCandidate) {
        try {
          const addr = addrCandidate;
          const pos = await geocodeWithMapbox(addr);
          if (pos) { lng = pos.lng; lat = pos.lat; }
        } catch {}
      }
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        const color = car.color || colorForCar(car.id);
        const iconId = `fa-car-${(color || '').replace(/[^a-zA-Z0-9]/g,'')}`;
        colorsToLoad.add(JSON.stringify({ id: iconId, color }));
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {
            title: (car.__driverName && car.__driverName.trim()) ? car.__driverName : (car.name || 'Voiture'),
            subtitle: ((addrCandidate || '') + (Number.isFinite(car.__availSeats) ? ` • ${car.__availSeats} place(s) libre(s)` : '')).trim(),
            color, iconId, carId: car.id
          }
        });
        bounds.extend([lng, lat]);
      }
    }

    // Ensure source exists
    if (!evMap.getSource('ev-cars')) {
      try { evMap.addSource('ev-cars', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); } catch {}
    }
    // Ensure layers exist even on subsequent renders (kept as fallback)
    try {
      // Generate and load a colored FA car icon per unique color (no SDF needed)
      try {
        for (const entry of colorsToLoad) {
          const { id, color } = JSON.parse(entry);
          if (evMap.hasImage && evMap.hasImage(id)) continue;
          const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path fill='${color}' d='M362.7 192l-13.5-40.4c-6.8-20.5-26-34.6-47.6-34.6H210.5c-21.6 0-40.8 14.1-47.6 34.6L149.3 192H96c-17.7 0-32 14.3-32 32v96c0 17.7 14.3 32 32 32h16c0 17.7 14.3 32 32 32s32-14.3 32-32h160c0 17.7 14.3 32 32 32s32-14.3 32-32h16c17.7 0 32-14.3 32-32v-96c0-17.7-14.3-32-32-32h-53.3zM192 192l10.7-32c2.3-6.8 8.7-11.4 15.9-11.4h90.9c7.2 0 13.6 4.6 15.9 11.4l10.7 32H192zM160 328c-13.3 0-24-10.7-24-24s10.7-24 24-24 24 10.7 24 24-10.7 24-24 24zm216 0c-13.3 0-24-10.7-24-24s10.7-24 24-24 24 10.7 24 24-10.7 24-24 24z'/></svg>`);
          await new Promise((res) => {
            evMap.loadImage(`data:image/svg+xml;charset=utf-8,${svg}`,(err,img)=>{
              try { if (!err && img && !(evMap.hasImage && evMap.hasImage(id))) evMap.addImage(id, img); } catch {}
              res();
            });
          });
        }
      } catch {}

      // Symbol layer: prefer FA icon, fallback to built-in sprite 'car-15', tint with per-car color
      const ensureSymbolLayer = () => {
        const layer = evMap.getLayer('ev-cars-symbol');
        if (layer && layer.type !== 'symbol') {
          try { evMap.removeLayer('ev-cars-symbol'); } catch {}
        }
        if (!evMap.getLayer('ev-cars-symbol')) {
          evMap.addLayer({
            id: 'ev-cars-symbol',
            type: 'symbol',
            source: 'ev-cars',
            layout: {
              'icon-image': ['coalesce', ['get','iconId'], 'car-15'],
              'icon-size': 1.6,
              'icon-allow-overlap': true
            },
            paint: {}
          });
        } else {
          try {
            evMap.setLayoutProperty('ev-cars-symbol', 'icon-image', ['coalesce', ['get','iconId'], 'car-15']);
            evMap.setLayoutProperty('ev-cars-symbol', 'icon-size', 1.6);
          } catch {}
        }
      };

      // Circle fallback layer under the symbol layer
      const ensureCircleLayer = () => {
        const layer = evMap.getLayer('ev-cars-circles');
        if (layer && layer.type !== 'circle') {
          try { evMap.removeLayer('ev-cars-circles'); } catch {}
        }
        if (!evMap.getLayer('ev-cars-circles')) {
          evMap.addLayer({
            id: 'ev-cars-circles',
            type: 'circle',
            source: 'ev-cars',
            paint: {
              'circle-color': ['coalesce', ['get','color'], '#4f46e5'],
              'circle-radius': 6,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          });
        } else {
          try {
            evMap.setPaintProperty('ev-cars-circles', 'circle-color', ['coalesce', ['get','color'], '#4f46e5']);
          } catch {}
        }
      };

      ensureCircleLayer();
      ensureSymbolLayer();
      try {
        evMap.moveLayer('ev-cars-circles');
        evMap.moveLayer('ev-cars-symbol');
        if (evMap.getLayer('ev-cars-labels')) evMap.moveLayer('ev-cars-labels');
      } catch {}
      if (!evMap.getLayer('ev-cars-labels')) {
        evMap.addLayer({
          id: 'ev-cars-labels',
          type: 'symbol',
          source: 'ev-cars',
          layout: {
            'text-field': ['get', 'subtitle'],
            'text-size': 11,
            'text-offset': [0, 1.2],
            'text-anchor': 'top'
          },
          paint: {
            'text-color': '#111827',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1
          }
        }, 'ev-cars-symbol');
      }
      if (!evMap.getLayer('ev-cars-hit')) {
        // place hit layer on top for best clickability
        evMap.addLayer({
          id: 'ev-cars-hit',
          type: 'circle',
          source: 'ev-cars',
          paint: {
            'circle-radius': 16,
            'circle-color': '#000000',
            'circle-opacity': 0
          }
        });
      }

      // Keep map click for showing popup only (not direct booking)
      // Bind interactions once
      if (!window.__evCarsHandlersBound) {
        try {
          ['ev-cars-hit','ev-cars-layer','ev-cars-circles'].forEach(layerId => {
            evMap.on('mouseenter', layerId, () => { evMap.getCanvas().style.cursor = 'pointer'; });
            evMap.on('mouseleave', layerId, () => { evMap.getCanvas().style.cursor = ''; });
          });
          evMap.on('click', 'ev-cars-hit', (e) => {
            const f = e.features && e.features[0];
            if (!f) return;
            const p = f.properties || {};
            const html = `<div><strong>${p.title || 'Voiture'}</strong><div>${p.subtitle || ''}</div></div>`;
            new mapboxgl.Popup().setLngLat(e.lngLat).setHTML(html).addTo(evMap);
          });
          window.__evCarsHandlersBound = true;
        } catch {}
      }
    } catch {}
    const src = evMap.getSource('ev-cars');
    if (src && src.setData) src.setData({ type: 'FeatureCollection', features });

    // Remove previous DOM markers for cars
    try { (__carMarkers || []).forEach(m => m.remove()); } catch {}
    __carMarkers = [];
    try {
      for (const f of features) {
        const [lng, lat] = (f.geometry && f.geometry.coordinates) || [];
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
        const el = document.createElement('div');
        el.className = 'car-pin';
        el.innerHTML = '<i class="fa-solid fa-car-side"></i>';
        if (f.properties && f.properties.color) {
          el.style.setProperty('--car-pin-color', f.properties.color);
        }
        const popupText = `<div><strong>${f.properties?.title || 'Voiture'}</strong><div>${f.properties?.subtitle || ''}</div></div>`;
        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .setPopup(new mapboxgl.Popup({ offset: 18 }).setHTML(popupText))
          .addTo(evMap);
        __carMarkers.push(marker);
      }
    } catch {}

    if (features.length) { try { evMap.fitBounds(bounds, { padding: 40, maxZoom: 13 }); } catch {} }
  } catch {}
}

let __passengerCrudBound = false;
function bindPassengerCrud() {
  if (__passengerCrudBound) return;
  __passengerCrudBound = true;
  document.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit-pass]');
    const unassignBtn = e.target.closest('[data-unassign-pass]');
    const delBtn = e.target.closest('[data-del-pass]');
    const copyAddrBtn = e.target.closest('[data-copy-car-addr]');
    const bookFromPopupBtn = e.target.closest('[data-book-car-popup]');
    const delCarBtn = e.target.closest('[data-delcar]');
    const editCarBtn = e.target.closest('[data-editcar]');
    try {
      // Car: delete (delegated)
      if (delCarBtn) {
        e.preventDefault(); e.stopPropagation();
        if (delCarBtn.dataset.busy === '1') return;
        const cid = delCarBtn.getAttribute('data-delcar');
        if (!cid) return;
        if (!confirm('Supprimer cette voiture ?\n\n⚠️ Le conducteur sera retiré du trajet.\n✅ Les passagers resteront inscrits mais sans voiture assignée.')) return;
        try {
          delCarBtn.dataset.busy = '1';
          delCarBtn.textContent = 'Suppression...';
          
          const userToken = getUserToken();
          console.log('Tentative de suppression de la voiture:', cid);
          console.log('Token utilisateur:', userToken ? 'présent' : 'MANQUANT');
          
          const response = await fetch(`/api/v1/cars/${cid}`, {
            method: 'DELETE',
            headers: {
              'X-User-Token': userToken,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('Réponse suppression:', response.status, response.statusText);
          console.log('Response headers:', [...response.headers.entries()]);
          
          // Essayer de lire la réponse même en cas d'erreur
          let responseText = '';
          try {
            responseText = await response.clone().text();
            console.log('Response body (raw):', responseText);
          } catch (e) {
            console.log('Could not read response body:', e);
          }
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Erreur suppression:', errorData);
            
            // Gestion des erreurs spécifiques
            if (errorData.error === 'CAR_HAS_PARTICIPANTS') {
              throw new Error('Impossible de supprimer une voiture avec des participants. Retirez d\'abord tous les participants.');
            } else if (errorData.error === 'UNAUTHORIZED') {
              throw new Error('Vous n\'avez pas l\'autorisation de supprimer cette voiture.');
            } else {
              throw new Error(errorData.error || `Erreur serveur (${response.status})`);
            }
          }
          
          showToast('Voiture supprimée avec succès');
          await loadEvent();
        } catch (error) {
          console.error('=== ERREUR SUPPRESSION DÉTAILLÉE ===');
          console.error('Error object:', error);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
          console.error('=====================================');
          
          // Afficher une alerte avec plus de détails pour debug
          alert(`ERREUR SUPPRESSION:\n${error.message}\n\nVoir console pour plus de détails`);
          showToast(`Suppression impossible: ${error.message}`, 'error');
        } finally { 
          delete delCarBtn.dataset.busy;
          delCarBtn.textContent = 'Supprimer la voiture';
        }
        return;
      }
      // Car: edit open dialog (delegated)
      if (editCarBtn) {
        const cid = editCarBtn.getAttribute('data-editcar');
        const dialog = document.getElementById(`editCarDialog-${cid}`);
        if (dialog) { try { dialog.showModal(); } catch { dialog.show(); } }
        return;
      }
      if (copyAddrBtn) {
        const addr = copyAddrBtn.getAttribute('data-copy-car-addr') || '';
        if (addr) { await navigator.clipboard.writeText(addr); showToast('Adresse copiée'); }
        return;
      }
      if (bookFromPopupBtn) {
        const cid = bookFromPopupBtn.getAttribute('data-book-car-popup');
        if (cid) { await openBookingForCar(cid); }
        return;
      }
      if (editBtn) {
        const pid = editBtn.getAttribute('data-edit-pass');
        const currentName = editBtn.getAttribute('data-pass-name') || editBtn.closest('.passenger')?.querySelector('span:not(.avatar)')?.textContent || '';
        const name = prompt('Nouveau nom du passager:', currentName);
        if (!name) return;
        await fetchJSON(`/api/v1/participants/${pid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) });
        showToast('Passager modifié');
        await loadEvent();
        return;
      }
      if (unassignBtn) {
        const pid = unassignBtn.getAttribute('data-unassign-pass');
        await fetchJSON(`/api/v1/participants/${pid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ car_id: null }) });
        showToast('Passager retiré de la voiture');
        await loadEvent();
        return;
      }
      if (delBtn) {
        const pid = delBtn.getAttribute('data-del-pass');
        if (!confirm('Supprimer ce passager ?')) return;
        await fetchJSON(`/api/v1/participants/${pid}`, { method: 'DELETE' });
        showToast('Passager supprimé');
        await loadEvent();
        return;
      }
    } catch { showToast('Action impossible', 'error'); }
  });
}

function parseAddressParts(feat) {
  try {
    const ctx = Array.isArray(feat.context) ? feat.context : [];
    const getCtx = (prefix) => {
      const c = ctx.find(x => x.id && x.id.startsWith(prefix));
      return c ? (c.text || (c.properties && (c.properties.name || c.properties.short_code)) || '') : '';
    };
    const number = feat.address || '';
    const street = feat.text || (feat.properties && (feat.properties.street || '')) || '';
    const postcode = getCtx('postcode');
    const city = getCtx('place') || getCtx('locality') || getCtx('district');
    const label = feat.place_name || '';
    return { label, number, street, postcode, city };
  } catch { return { label: '', number: '', street: '', postcode: '', city: '' }; }
}
if (!getUserToken()) { window.location.href = '/index.html'; }

let currentRideId = null;
function rideTokenKey(id) { return `rideToken:${id}`; }
let bookCarId = null;

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

async function fetchJSON(url, options = {}) {
  const headers = options.headers || {};
  headers['X-User-Token'] = getUserToken();
  const token = currentRideId ? sessionStorage.getItem(rideTokenKey(currentRideId)) : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  // Some endpoints (e.g., DELETE) may return 204 No Content
  try {
    const text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return text; }
  } catch { return null; }
}

// Params
const params = new URLSearchParams(window.location.search);
const clubId = params.get('clubId') || params.get('groupId');
const eventId = params.get('eventId') || params.get('id');

// Back link to club if available
const backToClub = document.getElementById('backToClub');
if (backToClub && clubId) backToClub.href = `/club-detail.html?id=${encodeURIComponent(clubId)}`;

// Modals and buttons
const driverModal = document.getElementById('driverModal');
const passengerModal = document.getElementById('passengerModal');
const joinDriverBtn = document.getElementById('joinDriverBtn');
const joinPassengerBtn = document.getElementById('joinPassengerBtn');
const bookDialog = document.getElementById('bookDialog');
const bookForm = document.getElementById('bookForm');
const bookName = document.getElementById('bookName');
const deleteEventBtn = document.getElementById('deleteEventBtn');
let driverGeocoderInited = false;
let evMap = null;
let evMapReady = false;
let autoGeoInProgress = false;

async function geocodeWithMapbox(address) {
  try {
    if (!address || !window.__MAPBOX_TOKEN) return null;
    const q = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${encodeURIComponent(window.__MAPBOX_TOKEN)}&limit=1&language=fr&country=${encodeURIComponent(window.__MAPBOX_COUNTRIES || 'be,fr')}`;
    const resp = await fetch(url);
    const data = await resp.json();
    const feat = (data.features || [])[0];
    if (feat && feat.center) {
      return { lng: parseFloat(feat.center[0]), lat: parseFloat(feat.center[1]) };
    }
  } catch {}
  return null;
}

async function autoGeocodeMissingCars(cars) {
  if (autoGeoInProgress) return;
  autoGeoInProgress = true;
  let updatedAny = false;
  try {
    for (const car of (cars || [])) {
      const hasGeo = !!(car && car.latitude && car.longitude);
      const addr = car?.pickup_address || car?.origin || car?.departure || car?.departure_address || car?.address || car?.location || car?.start_address || '';
      if (hasGeo || !addr) continue;
      try {
        const pos = await geocodeWithMapbox(addr);
        if (pos) {
          await fetchJSON(`/api/v1/cars/${car.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: pos.lat, longitude: pos.lng })
          });
          updatedAny = true;
          // small delay to avoid rate limits
          await new Promise(r => setTimeout(r, 250));
        }
      } catch {}
    }
  } finally {
    autoGeoInProgress = false;
    if (updatedAny) {
      try { await loadEvent(); } catch {}
    }
  }
}

function ensureEventMap() {
  try {
    if (evMap) return evMap;
    if (!window.__MAPBOX_TOKEN || !window.mapboxgl) return null;
    mapboxgl.accessToken = window.__MAPBOX_TOKEN;
    evMap = new mapboxgl.Map({
      container: 'evMap',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [4.4699, 50.5039],
      zoom: 7
    });
    evMap.addControl(new mapboxgl.NavigationControl());
    evMap.on('load', () => {
      try {
        evMap.addSource('ev-cars', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        evMap.addLayer({
          id: 'ev-cars-layer',
          type: 'circle',
          source: 'ev-cars',
          paint: {
            'circle-color': '#4f46e5',
            'circle-radius': 7,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
          }
        });
        evMapReady = true;
      } catch {}
    });
    return evMap;
  } catch { return null; }
}

function initDriverGeocoder() {
  try {
    if (driverGeocoderInited) return;
    if (!window.__MAPBOX_TOKEN || !window.mapboxgl || !window.MapboxGeocoder) return;
    mapboxgl.accessToken = window.__MAPBOX_TOKEN;
    const el = document.getElementById('daddrGeocoder');
    if (!el) return;
    const g = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl,
      placeholder: 'Rechercher une adresse de départ',
      marker: false,
      language: 'fr',
      types: 'address,poi,place',
      countries: (window.__MAPBOX_COUNTRIES || 'be,fr')
    });
    g.addTo(el);
    g.on('result', (e) => {
      const feat = e.result;
      const label = (feat && (feat.place_name || feat.text)) || '';
      const input = document.getElementById('daddr');
      if (input && label) input.value = label;
      // Fill coords
      try {
        const lat = (feat && feat.center && feat.center[1]) || '';
        const lng = (feat && feat.center && feat.center[0]) || '';
        const latEl = document.getElementById('daddr_lat');
        const lngEl = document.getElementById('daddr_lng');
        if (latEl) latEl.value = lat || '';
        if (lngEl) lngEl.value = lng || '';
      } catch {}
    });
    driverGeocoderInited = true;
  } catch {}
}

joinDriverBtn?.addEventListener('click', async () => {
  try {
    const me = await fetchJSON('/api/v1/me');
    const dn = document.getElementById('dname');
    if (dn) dn.value = (me.display_name || `${me.first_name || ''} ${me.last_name || ''}`.trim() || '').trim();
  } catch {}
  // Ensure geocoder is present in the modal
  initDriverGeocoder();
  driverModal.showModal();
});
joinPassengerBtn?.addEventListener('click', () => passengerModal.showModal());

async function ensureAuthIfNeeded(id) {
  try {
    currentRideId = String(id);
    await fetchJSON(`/api/v1/rides/${id}`);
    return;
  } catch (e) {
    if (String(e).includes('HTTP 401')) {
      const pwd = prompt('Cet évènement est protégé. Entrez le mot de passe:');
      if (!pwd) throw new Error('PASSWORD_REQUIRED');
      const res = await fetch(`/api/v1/rides/${id}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Token': getUserToken() },
        body: JSON.stringify({ password: pwd })
      });
      if (!res.ok) throw new Error('AUTH_FAILED');
      const data = await res.json();
      if (data.token) sessionStorage.setItem(rideTokenKey(id), data.token);
      return;
    }
    throw e;
  }
}

function avatarFor(name) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return `<span class="avatar">${initial}</span>`;
}

function passengerItem(p, canManage) {
  const base = `${avatarFor(p.name)} <span>${p.name}</span>`;
  if (!canManage) return `<li class="passenger">${base}</li>`;
  return `
    <li class="passenger">
      ${base}
      <span class="btn-row mt-0">
        <button class="btn btn-xs" data-edit-pass="${p.id}" data-pass-name="${(p.name || '').replace(/"/g,'&quot;')}">Modifier</button>
        ${p.car_id ? `<button class="btn btn-xs" data-unassign-pass="${p.id}">Retirer de la voiture</button>` : ''}
        <button class="btn btn-xs btn-danger" data-del-pass="${p.id}">Supprimer</button>
      </span>
    </li>`;
}

function emptySeatItem() {
  return `
    <li class="empty-seat">
      <div class="seat-title">Place libre</div>
      <div class="seat-sub">En attente d'un passager</div>
    </li>`;
}

async function loadEvent() {
  const id = eventId;
  if (!id) {
    document.getElementById('eventHeader').innerHTML = '<div class="alert alert-warning">Lien invalide.</div>';
    return;
  }
  await ensureAuthIfNeeded(id);

  try {
    const data = await fetchJSON(`/api/v1/rides/${id}`);
    const { ride, drivers, passengers, cars, waiting_list } = data;

    // Header
    document.getElementById('eventName').textContent = ride.title || 'Événement';
    const placeText = ride.origin || ride.destination || '-';
    document.getElementById('eventPlace').textContent = placeText;
    try {
      const gmaps = document.getElementById('evGmaps');
      const waze = document.getElementById('evWaze');
      const copyBtn = document.getElementById('copyPlaceBtn');
      if (gmaps) gmaps.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeText)}`;
      if (waze) waze.href = `https://waze.com/ul?q=${encodeURIComponent(placeText)}&navigate=yes`;
      copyBtn?.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(placeText); showToast("Adresse copiée"); }
        catch { showToast('Copie impossible', 'error'); }
      }, { once: true });
    } catch {}
    document.getElementById('eventDate').textContent = new Date(ride.date).toLocaleDateString('fr-FR') + (ride.time ? ' à ' + ride.time : '');
    document.getElementById('eventDesc').textContent = ride.note || '-';

    // Permission check for delete
    try {
      let canDelete = false;
      // creator check if API provides it
      try {
        const me = await fetchJSON('/api/v1/me');
        const creatorId = ride.created_by_id || ride.creator_id || ride.user_id || null;
        if (me && creatorId && (String(me.id) === String(creatorId))) canDelete = true;
      } catch {}
      // owner of the club
      const groupIdForPerm = clubId || ride.group_id || ride.groupId || ride.group || null;
      if (!canDelete && groupIdForPerm) {
        try {
          const g = await fetchJSON(`/api/v1/groups/${groupIdForPerm}`);
          if (g && (g.role === 'owner' || g.role === 'admin')) canDelete = true;
        } catch {}
      }
      if (canDelete && deleteEventBtn) {
        deleteEventBtn.style.display = '';
        if (!deleteEventBtn.dataset.bound) {
          deleteEventBtn.addEventListener('click', async () => {
            if (!confirm("Supprimer l'événement ?")) return;
            try {
              await fetchJSON(`/api/v1/rides/${eventId}`, { method: 'DELETE' });
              showToast("Événement supprimé");
              const backClub = (ride.group_id || ride.groupId || clubId);
              if (backClub) { location.href = `/club-detail.html?id=${backClub}`; }
              else { location.href = '/clubs.html'; }
            } catch (e) {
              showToast("Suppression de l'événement impossible", 'error');
            }
          });
          deleteEventBtn.dataset.bound = '1';
        }
      }
    } catch {}

    // Stats
    const driversCount = drivers.length;
    const passengersCount = passengers.length;
    const seatsTaken = ride.seats_taken ?? (cars || []).reduce((acc, c) => acc + (Number(c.seats_taken)||0), 0);
    document.getElementById('statDrivers').textContent = driversCount;
    document.getElementById('statPassengers').textContent = passengersCount;
    document.getElementById('statSeats').textContent = seatsTaken;

    // Cars list
    const carsContainer = document.getElementById('carsContainer');
    const waitingPassengers = (passengers || []).filter(p => !p.car_id);
    let canManageCars = false;
    try {
      const groupIdForPerm = clubId || ride.group_id || ride.groupId || ride.group || null;
      if (groupIdForPerm) {
        const g = await fetchJSON(`/api/v1/groups/${groupIdForPerm}`);
        if (g && (g.role === 'owner' || g.role === 'admin')) canManageCars = true;
      }
    } catch {}

    const carTpl = document.getElementById('carCardTpl');
    const passTpl = document.getElementById('passengerItemTpl');
    const emptyTpl = document.getElementById('emptySeatTpl');
    const assignTpl = document.getElementById('assignTpl');
    const editTpl = document.getElementById('editCarDialogTpl');

    carsContainer.innerHTML = '';
    (cars || []).forEach(car => {
      const carDrivers = drivers.filter(d => d.car_id === car.id);
      const carPassengers = passengers.filter(p => p.car_id === car.id);
      const seatsTakenCar = Number(car.seats_taken || 0);
      const seatsTotalCar = Number(car.seats_total || 0);
      const emptySeats = Math.max(seatsTotalCar - seatsTakenCar, 0);
      const addrDisplay = car.pickup_address || car.origin || car.departure || car.departure_address || car.address || car.location || car.start_address || '';

      const frag = carTpl.content.cloneNode(true);
      try { frag.firstElementChild.style.borderLeft = `4px solid ${car.color || colorForCar(car.id)}`; } catch {}
      // Store info for map popups
      car.__driverName = (carDrivers.length ? carDrivers.map(d => d.name).join(', ') : (car.driver_name || 'Conducteur'));
      car.__addrDisplay = addrDisplay || '';
      car.__availSeats = emptySeats;

      frag.querySelector('[data-car-name]').textContent = car.name || 'Voiture';
      frag.querySelector('[data-car-address]').textContent = addrDisplay || 'Origine non définie';
      frag.querySelector('[data-car-time]').textContent = car.departure_time ? `• ${car.departure_time}` : '';
      frag.querySelector('[data-car-capacity]').textContent = `${seatsTakenCar}/${seatsTotalCar} places`;
      frag.querySelector('[data-car-driver]').textContent = (carDrivers.length ? carDrivers.map(d => d.name).join(', ') : (car.driver_name || '—'));

      // Address actions
      const gmaps = frag.querySelector('[data-gmaps]');
      const waze = frag.querySelector('[data-waze]');
      const copyBtn = frag.querySelector('[data-copy]');
      if (addrDisplay) {
        gmaps.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addrDisplay)}`;
        waze.href = `https://waze.com/ul?q=${encodeURIComponent(addrDisplay)}&navigate=yes`;
        copyBtn.setAttribute('data-copy-car-addr', addrDisplay);
      } else {
        const actions = frag.querySelector('[data-addr-actions]');
        if (actions) actions.style.display = 'none';
      }

      // Passengers
      const passList = frag.querySelector('[data-passengers]');
      (carPassengers || []).forEach(p => {
        const li = passTpl.content.cloneNode(true);
        li.querySelector('[data-name]').textContent = p.name || '';
        const avatar = li.querySelector('[data-avatar]');
        avatar.textContent = ((p.name || '?').trim()[0] || '?').toUpperCase();
        li.querySelector('[data-edit-pass]').setAttribute('data-edit-pass', p.id);
        const unassign = li.querySelector('[data-unassign-pass]');
        if (p.car_id) unassign.setAttribute('data-unassign-pass', p.id); else unassign.remove();
        li.querySelector('[data-del-pass]').setAttribute('data-del-pass', p.id);
        passList.appendChild(li);
      });
      const missing = Math.max(emptySeats - carPassengers.length, 0);
      for (let i=0;i<missing;i++) passList.appendChild(emptyTpl.content.cloneNode(true));

      // Actions
      const bookBtn = frag.querySelector('[data-book]');
      bookBtn.setAttribute('data-book-car', car.id);
      const editBtn = frag.querySelector('[data-edit]');
      const delBtn = frag.querySelector('[data-delete]');
      if (canManageCars) {
        editBtn.style.display = '';
        delBtn.style.display = '';
        editBtn.setAttribute('data-editcar', car.id);
        delBtn.setAttribute('data-delcar', car.id);
      }

      // Assign block
      if (emptySeats > 0 && waitingPassengers.length > 0) {
        const a = assignTpl.content.cloneNode(true);
        a.querySelector('[data-assign-car]').setAttribute('data-assign-car', car.id);
        const sel = a.querySelector('[data-assign-select]');
        sel.setAttribute('data-assign-select', car.id);
        waitingPassengers.forEach(w => {
          const opt = document.createElement('option');
          opt.value = w.id;
          opt.textContent = w.name;
          sel.appendChild(opt);
        });
        frag.querySelector('[data-assign]').appendChild(a);
      }

      if (canManageCars) {
        const d = editTpl.content.cloneNode(true);
        const dlg = d.querySelector('[data-edit-dialog]');
        const form = d.querySelector('[data-edit-form]');
        const addr = d.querySelector('[data-addr]');
        const lat = d.querySelector('[data-lat]');
        const lng = d.querySelector('[data-lng]');
        const geocoderDiv = d.querySelector('[data-geocoder]');
        dlg.id = `editCarDialog-${car.id}`;
        form.id = `editCarForm-${car.id}`;
        geocoderDiv.id = `carEditGeocoder-${car.id}`;
        addr.id = `eca_address_${car.id}`; addr.value = addrDisplay || '';
        lat.id = `eca_lat_${car.id}`; lat.value = car.latitude != null ? car.latitude : '';
        lng.id = `eca_lng_${car.id}`; lng.value = car.longitude != null ? car.longitude : '';
        d.querySelector('[data-cancel]').setAttribute('data-cancel-ec', car.id);
        frag.querySelector('[data-dialog]').appendChild(d);
      }

      carsContainer.appendChild(frag);
    });

    // Ensure delegated CRUD binding is active (runs once)
    bindPassengerCrud();

    // Update map with cars markers, then show destination marker
    await renderCarsOnMap(cars);
    try {
      const destAddr = ride.destination || ride.place || '';
      const destColor = ride.color || ride.icon_color || null;
      await showDestinationOnMap(destAddr, destColor);
    } catch {}
    // Attempt auto-geocoding for cars missing coordinates
    try { autoGeocodeMissingCars(cars); } catch {}

    // Bind booking buttons (open modal, prefill name)
    document.querySelectorAll('[data-book-car]')?.forEach(btn => {
      btn.addEventListener('click', async () => {
        bookCarId = parseInt(btn.getAttribute('data-book-car'), 10);
        try {
          const me = await fetchJSON('/api/v1/me');
          if (bookName) bookName.value = (me.display_name || `${me.first_name || ''} ${me.last_name || ''}`.trim() || '').trim();
        } catch {}
        bookDialog?.showModal();
      });
    });

    // Per-button bindings removed: rely on delegated handlers in bindPassengerCrud()
    // Bind assign-to-car buttons
    document.querySelectorAll('[data-assign-car]')?.forEach(btn => {
      btn.addEventListener('click', async () => {
        const cid = btn.getAttribute('data-assign-car');
        const sel = document.querySelector(`[data-assign-select="${cid}"]`);
        const pid = sel && sel.value ? parseInt(sel.value, 10) : null;
        if (!pid) { showToast('Choisissez un passager', 'error'); return; }
        try {
          await fetchJSON(`/api/v1/participants/${pid}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ car_id: parseInt(cid, 10) })
          });
          showToast('Passager affecté');
          await loadEvent();
        } catch (e) { showToast('Affectation impossible', 'error'); }
      });
    });

    // Waiting list
    const waitingCard = document.getElementById('waitingCard');
    const waitingListEl = document.getElementById('waitingList');
    if (waiting_list && waiting_list.length) {
      waitingCard.style.display = 'block';
      waitingListEl.innerHTML = waiting_list.map(w => passengerItem({ id: w.id, name: w.name, car_id: null }, true)).join('');
    } else {
      waitingCard.style.display = 'none';
      waitingListEl.innerHTML = '';
    }
    // Delegated binding already active; nothing else to do
  } catch (e) {
    document.getElementById('eventHeader').innerHTML = '<div class="alert alert-warning">Événement introuvable.</div>';
  }
}

// Join as driver -> create car (requires departure address)
const driverForm = document.getElementById('driverForm');
driverForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const driver_name = document.getElementById('dname').value.trim();
  const origin = document.getElementById('daddr').value.trim();
  const departure_time = document.getElementById('dtime').value;
  const seats_total = parseInt(document.getElementById('dseats').value, 10) || 4;
  if (!driver_name || !origin) { showToast('Nom et adresse de départ requis', 'error'); return; }
  try {
    // Geocode origin -> latitude/longitude (Mapbox)
    let latitude = null, longitude = null;
    try {
      if (window.__MAPBOX_TOKEN) {
        const q = encodeURIComponent(origin);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${encodeURIComponent(window.__MAPBOX_TOKEN)}&limit=1&language=fr&country=${encodeURIComponent(window.__MAPBOX_COUNTRIES || 'be,fr')}`;
        const resp = await fetch(url);
        const data = await resp.json();
        const feat = (data.features || [])[0];
        if (feat && feat.center) {
          longitude = parseFloat(feat.center[0]);
          latitude = parseFloat(feat.center[1]);
        }
      }
    } catch {}

    // Hidden coords override if present
    const latVal = document.getElementById('daddr_lat')?.value || '';
    const lngVal = document.getElementById('daddr_lng')?.value || '';
    if (!latitude && latVal) latitude = parseFloat(latVal);
    if (!longitude && lngVal) longitude = parseFloat(lngVal);

    await fetchJSON(`/api/v1/rides/${eventId}/cars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_name, origin, departure_time, seats_total, pickup_address: origin, latitude, longitude })
    });
    driverModal.close();
    showToast('Voiture créée');
    await loadEvent();
  } catch (e) { showToast('Impossible de créer la voiture', 'error'); }
});

// Join as passenger
const passengerForm = document.getElementById('passengerForm');
passengerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('pname').value.trim();
  if (!name) return;
  try {
    await fetchJSON(`/api/v1/rides/${eventId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role: 'passenger' })
    });
    passengerModal.close();
    await loadEvent();
  } catch (e) { alert('Impossible d\'ajouter le passager'); }
});

// Book seat modal submit
bookForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = (bookName?.value || '').trim();
  if (!name) { showToast('Nom requis', 'error'); return; }
  if (!bookCarId) { showToast('Voiture invalide', 'error'); return; }
  try {
    await fetchJSON(`/api/v1/rides/${eventId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role: 'passenger', car_id: bookCarId })
    });
    bookDialog?.close();
    showToast('Réservation confirmée');
    await loadEvent();
  } catch (e) {
    showToast('Réservation impossible', 'error');
  }
});

// Init
(function init(){
  if (!eventId) {
    document.getElementById('eventHeader').innerHTML = '<div class="alert alert-warning">Paramètres manquants.</div>';
    return;
  }
  loadEvent();
})();
