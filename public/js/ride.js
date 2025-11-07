function getUserToken() { return localStorage.getItem('userToken'); }
if (!getUserToken()) { window.location.href = '/index.html'; }

let currentRideId = null;
function rideTokenKey(id) { return `rideToken:${id}`; }

async function fetchJSON(url, options = {}) {
  const headers = options.headers || {};
  headers['X-User-Token'] = getUserToken();
  const token = currentRideId ? sessionStorage.getItem(rideTokenKey(currentRideId)) : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

const params = new URLSearchParams(window.location.search);
const code = params.get('code');
const rideIdParam = params.get('id') || (window.rideId ? String(window.rideId) : null);

const form = document.getElementById('participantForm');
const seatsBox = document.getElementById('seatsOfferedBox');
const carChoiceBox = document.getElementById('carChoiceBox');
const carSelect = document.getElementById('pcar');
const carForm = document.getElementById('carForm');
const carAddress = document.getElementById('car_address');
const carLatEl = document.getElementById('car_lat');
const carLngEl = document.getElementById('car_lng');
const toggleShowAllCarsEl = document.getElementById('toggleShowAllCars');
const carNumberEl = document.getElementById('car_number');
const carStreetEl = document.getElementById('car_street');
const carPostcodeEl = document.getElementById('car_postcode');
const carCityEl = document.getElementById('car_city');

// Map setup (Mapbox GL JS)
let map;
let clickMarker;
let currentCars = [];
let showAllCars = false;
let reserveHandlerBound = false;
let mapReady = false;

function ensureMap() {
  if (map) return map;
  if (!window.__MAPBOX_TOKEN) {
    console.warn('Missing Mapbox token in window.__MAPBOX_TOKEN');
  }
  mapboxgl.accessToken = window.__MAPBOX_TOKEN || '';
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [4.4699, 50.5039], // [lng, lat] Belgium
    zoom: 7
  });
  map.addControl(new mapboxgl.NavigationControl());

  map.on('load', () => {
    // Source for cars with clustering
    map.addSource('cars', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 40
    });

    // Cluster circles
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'cars',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#a5b4fc',
          10,
          '#818cf8',
          30,
          '#4f46e5'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          16,
          10,
          20,
          30,
          26
        ]
      }
    });

    // Cluster count labels
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'cars',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      },
      paint: {
        'text-color': '#ffffff'
      }
    });

    // Unclustered points
    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'cars',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#4f46e5',
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Zoom into clusters on click
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const clusterId = features[0].properties.cluster_id;
      map.getSource('cars').getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        map.easeTo({ center: features[0].geometry.coordinates, zoom });
      });
    });

    // Show popup for a single point
    map.on('click', 'unclustered-point', (e) => {
      const feature = e.features && e.features[0];
      if (!feature) return;
      const props = feature.properties || {};
      const carId = Number(props.id);
      const name = props.name || 'Voiture';
      const origin = props.origin || '';
      const pickup = props.pickup || '';
      const seatsInfo = props.seatsInfo || '';
      const disabled = props.available === 'true' ? '' : 'disabled title="Complet"';
      const html = `
        <div class="popup-box">
          <div class="popup-title">${name}</div>
          <div class="muted-line">${origin}</div>
          <div class="muted-line">${pickup}</div>
          <div class="popup-seats">${seatsInfo}</div>
          <button class="btn btn-small" data-reserve-car="${carId}" ${disabled}>Réserver ici</button>
        </div>`;
      new mapboxgl.Popup({ offset: 8 })
        .setLngLat(feature.geometry.coordinates)
        .setHTML(html)
        .addTo(map);
    });

    // Cursor styles
    map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = ''; });

    mapReady = true;
    // Initial render if cars are already set
    try { renderCarMarkers(); } catch {}

    // Initialize Mapbox Geocoder for address autocomplete
    try {
      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl,
        placeholder: 'Rechercher une adresse',
        marker: false,
        language: 'fr',
        types: 'address,poi,place',
        countries: (window.__MAPBOX_COUNTRIES || 'be,fr')
      });
      const geocoderContainer = document.getElementById('carAddressGeocoder');
      if (geocoderContainer) geocoder.addTo(geocoderContainer);
      geocoder.on('result', (e) => {
        const feat = e.result;
        const [lng, lat] = feat.center || [];
        const label = feat.place_name || '';
        if (carAddress) carAddress.value = label;
        if (carLatEl) carLatEl.value = lat || '';
        if (carLngEl) carLngEl.value = lng || '';
        // Show marker at selection
        try {
          if (clickMarker) clickMarker.remove();
          clickMarker = new mapboxgl.Marker().setLngLat([lng, lat]).addTo(map);
          map.easeTo({ center: [lng, lat], zoom: 13 });
        } catch {}
        // Fill address components
        try {
          const parts = parseAddressParts(feat);
          if (carNumberEl) carNumberEl.value = parts.number || '';
          if (carStreetEl) carStreetEl.value = parts.street || '';
          if (carPostcodeEl) carPostcodeEl.value = parts.postcode || '';
          if (carCityEl) carCityEl.value = parts.city || '';
        } catch {}
      });
    } catch {}

    // Allow setting address by clicking on the map
    bindMapClickForAddress();
  });

  // Global delegation for reserve button in popups
  if (!reserveHandlerBound) {
    document.addEventListener('click', (ev) => {
      const btn = ev.target?.closest?.('[data-reserve-car]');
      if (!btn) return;
      const cid = parseInt(btn.getAttribute('data-reserve-car'), 10);
      const disabled = btn.hasAttribute('disabled');
      if (disabled) return;
      const roleInput = form.querySelector('input[name="prole"][value="passenger"]');
      if (roleInput) {
        roleInput.checked = true;
        form.dispatchEvent(new Event('change'));
      }
      if (carSelect) carSelect.value = String(cid);
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    reserveHandlerBound = true;
  }

  return map;
}

function renderCarMarkers() {
  ensureMap();
  if (!currentCars || !mapReady) return;
  const features = [];
  const bounds = new mapboxgl.LngLatBounds();
  currentCars.forEach((car) => {
    const hasGeo = car.latitude && car.longitude;
    if (!hasGeo) return;
    const seatsTaken = Number(car.seats_taken || 0);
    const seatsTotal = Number(car.seats_total || 0);
    const available = seatsTaken < seatsTotal;
    if (!showAllCars && !available) return;
    const lng = Number(car.longitude);
    const lat = Number(car.latitude);
    const seatsInfo = `${seatsTaken}/${seatsTotal} places`;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        id: String(car.id),
        name: car.name || 'Voiture',
        origin: car.origin || '',
        pickup: car.pickup_address || '',
        seatsInfo,
        available: available ? 'true' : 'false'
      }
    });
    bounds.extend([lng, lat]);
  });
  const src = map.getSource('cars');
  if (src) src.setData({ type: 'FeatureCollection', features });
  if (features.length) {
    try { map.fitBounds(bounds, { padding: 40, maxZoom: 13 }); } catch {}
  }
}

// Reverse geocoding helpers
async function reverseGeocodeParts(lng, lat) {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${encodeURIComponent(mapboxgl.accessToken)}&limit=1&language=fr`;
    const resp = await fetch(url);
    const data = await resp.json();
    const feat = (data.features || [])[0];
    return feat ? parseAddressParts(feat) : { label: '', number: '', street: '', postcode: '', city: '' };
  } catch { return { label: '', number: '', street: '', postcode: '', city: '' }; }
}

// Handle map click to set address and coords
function bindMapClickForAddress() {
  if (!map) return;
  map.on('click', async (e) => {
    const { lng, lat } = e.lngLat || {};
    if (lng == null || lat == null) return;
    // Place marker
    try {
      if (clickMarker) clickMarker.remove();
      clickMarker = new mapboxgl.Marker().setLngLat([lng, lat]).addTo(map);
    } catch {}
    // Reverse geocode and fill inputs
    const parts = await reverseGeocodeParts(lng, lat);
    const label = parts.label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (carAddress) carAddress.value = label;
    if (carLatEl) carLatEl.value = String(lat);
    if (carLngEl) carLngEl.value = String(lng);
    if (carNumberEl) carNumberEl.value = parts.number || '';
    if (carStreetEl) carStreetEl.value = parts.street || '';
    if (carPostcodeEl) carPostcodeEl.value = parts.postcode || '';
    if (carCityEl) carCityEl.value = parts.city || '';
  });
}

form.addEventListener('change', () => {
  const role = form.querySelector('input[name="prole"]:checked');
  const isDriver = role && role.value === 'driver';
  seatsBox.style.display = isDriver ? 'block' : 'none';
  carChoiceBox.style.display = !isDriver ? 'block' : 'none';
});

async function ensureAuthIfNeeded(id) {
  try {
    currentRideId = id;
    await fetchJSON(`/api/v1/rides/${id}`);
    return;
  } catch (e) {
    if (String(e).includes('HTTP 401')) {
      const pwd = prompt('Ce covoiturage est protégé. Entrez le mot de passe:');
      if (!pwd) throw new Error('PASSWORD_REQUIRED');
      const res = await fetch(`/api/v1/rides/${id}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Token': getUserToken() },
        body: JSON.stringify({ password: pwd })
      });
      if (!res.ok) throw new Error('AUTH_FAILED');
      const data = await res.json();
      if (!data.token) return;
      sessionStorage.setItem(rideTokenKey(id), data.token);
      return;
    }
    throw e;
  }
}

async function resolveAndInit() {
  if (code) {
    const info = await fetchJSON(`/api/v1/rides/resolve?code=${encodeURIComponent(code)}`);
    currentRideId = String(info.id);
  } else if (rideIdParam) {
    currentRideId = String(rideIdParam);
  } else {
    throw new Error('NO_RIDE');
  }
  await ensureAuthIfNeeded(currentRideId);
}

async function loadRide() {
  try {
    const data = await fetchJSON(`/api/v1/rides/${currentRideId}`);
    const { ride, drivers, passengers, cars, waiting_list } = data;
    document.getElementById('rideTitle').textContent = ride.title;
    document.getElementById('rideDate').textContent = new Date(ride.date).toLocaleDateString('fr-FR') + (ride.time ? ' à ' + ride.time : '');
    const routeText = ride.origin ? `${ride.origin} → ${ride.destination}` : (ride.destination || '-');
    document.getElementById('rideRoute').textContent = routeText;
    document.getElementById('rideNote').textContent = ride.note || '-';

    document.getElementById('statDrivers').textContent = drivers.length;
    document.getElementById('statPassengers').textContent = passengers.length;
    document.getElementById('statSeats').textContent = ride.seats_taken;

    const dList = document.getElementById('driversList');
    const pList = document.getElementById('passengersList');
    dList.innerHTML = drivers
      .filter(d => !d.car_id)
      .map(d => `<li>${d.name} ${d.seats_offered ? `(places: ${d.seats_offered})` : ''} <button data-del="p-${d.id}" class="btn btn-small btn-danger">Supprimer</button></li>`)
      .join('');
    pList.innerHTML = passengers
      .filter(p => !p.car_id)
      .map(p => `<li>${p.name} <button data-del="p-${p.id}" class="btn btn-small btn-danger">Supprimer</button></li>`)
      .join('');

    // Populate participant car select
    if (carSelect) {
      const opts = ['<option value="">— En attendre d\'affectation —</option>'].concat(
        cars.map(c => `<option value="${c.id}">${c.name || 'Voiture'} (${c.origin || '-'})</option>`)
      );
      carSelect.innerHTML = opts.join('');
    }

    // Render cars
    const carsContainer = document.getElementById('carsContainer');
    carsContainer.innerHTML = cars.map(car => {
      const carDrivers = drivers.filter(d => d.car_id === car.id);
      const carPassengers = passengers.filter(p => p.car_id === car.id);
      return `
        <div class="car-card">
          <div class="car-header">
            <div>
              <strong>${car.name || 'Voiture'}</strong>
              <div class="muted-line">${car.origin || 'Origine non définie'} ${car.departure_time ? '• ' + car.departure_time : ''}</div>
            </div>
            <div class="car-capacity">${car.seats_taken}/${car.seats_total} places</div>
          </div>
          <div><strong>Conducteur:</strong> ${carDrivers.length ? carDrivers.map(d => d.name).join(', ') : (car.driver_name || '—')}</div>
          <div class="mt-8"><strong>Adresse:</strong> ${car.pickup_address ? car.pickup_address : '—'}</div>
          <div class="mt-8"><strong>Passagers</strong></div>
          <ul class="passengers-list">
            ${carPassengers.map(p => `<li>${p.name} <button class="btn btn-small btn-danger" data-unassign="${p.id}">Retirer</button></li>`).join('') || '<li class="empty-seat">Aucun passager</li>'}
          </ul>
          <div class="btn-row">
            <button class="btn btn-small" data-editcar="${car.id}">Modifier l'adresse</button>
            <button class="btn btn-small btn-danger" data-delcar="${car.id}">Supprimer la voiture</button>
          </div>

          <dialog id="editCarDialog-${car.id}">
            <form method="dialog" class="form" id="editCarForm-${car.id}">
              <h3>Modifier l'adresse</h3>
              <div class="form-group">
                <label>Rechercher</label>
                <div id="carEditGeocoder-${car.id}"></div>
              </div>
              <div class="form-group">
                <label for="eca_address_${car.id}">Adresse complète</label>
                <input id="eca_address_${car.id}" value="${car.pickup_address || ''}" />
                <input id="eca_lat_${car.id}" type="hidden" value="${car.latitude != null ? car.latitude : ''}" />
                <input id="eca_lng_${car.id}" type="hidden" value="${car.longitude != null ? car.longitude : ''}" />
              </div>
              <div class="form-group">
                <label>Détails</label>
                <div class="row gap-12">
                  <input id="eca_number_${car.id}" placeholder="Numéro" style="max-width:120px" value="${car.pickup_number || ''}" />
                  <input id="eca_street_${car.id}" placeholder="Rue" class="flex-1" value="${car.pickup_street || ''}" />
                </div>
                <div class="row gap-12 mt-8">
                  <input id="eca_postcode_${car.id}" placeholder="Code postal" style="max-width:160px" value="${car.pickup_postcode || ''}" />
                  <input id="eca_city_${car.id}" placeholder="Ville" class="flex-1" value="${car.pickup_city || ''}" />
                </div>
              </div>
              <div class="nav mt-8">
                <button type="button" class="btn btn-secondary" data-cancel-ec="${car.id}">Annuler</button>
                <button class="btn" type="submit">Enregistrer</button>
              </div>
            </form>
          </dialog>
        </div>
      `;
    }).join('');

    // Map markers
    try {
      ensureMap();
      currentCars = cars;
      renderCarMarkers();
    } catch {}

    // Bind unassign and delete car
    document.querySelectorAll('[data-unassign]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pid = btn.getAttribute('data-unassign');
        try {
          await fetchJSON(`/api/v1/participants/${pid}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ car_id: null })
          });
          await loadRide();
        } catch (e) { alert('Impossible de retirer'); }
      });
    });
    document.querySelectorAll('[data-delcar]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cid = btn.getAttribute('data-delcar');
        if (!confirm('Supprimer cette voiture ? (Tous les participants seront automatiquement retirés)')) return;
        
        // Désactiver le bouton pendant la suppression
        btn.disabled = true;
        btn.textContent = 'Suppression...';
        
        try {
          console.log('Tentative de suppression de la voiture:', cid);
          const response = await fetch(`/api/v1/cars/${cid}`, {
            method: 'DELETE',
            headers: {
              'X-User-Token': getUserToken(),
              'Content-Type': 'application/json'
            }
          });
          
          console.log('Réponse suppression:', response.status, response.statusText);
          
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
          
          alert('Voiture supprimée avec succès !');
          await loadRide();
        } catch (error) {
          console.error('Erreur lors de la suppression:', error);
          alert(`Suppression impossible: ${error.message}`);
          
          // Restaurer le bouton
          btn.disabled = false;
          btn.textContent = 'Supprimer la voiture';
        }
      });
    });

    // Bind edit address dialogs
    document.querySelectorAll('[data-editcar]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = btn.getAttribute('data-editcar');
        const dialog = document.getElementById(`editCarDialog-${cid}`);
        if (!dialog) return;
        try { dialog.showModal(); } catch { dialog.show(); }

        // Initialize Mapbox Geocoder in dialog
        try {
          const geocoderEl = document.getElementById(`carEditGeocoder-${cid}`);
          if (geocoderEl && !geocoderEl.dataset.inited) {
            const geocoder = new MapboxGeocoder({
              accessToken: mapboxgl.accessToken,
              mapboxgl,
              placeholder: 'Rechercher une adresse',
              marker: false,
              language: 'fr',
              types: 'address,poi,place'
            });
            geocoder.addTo(geocoderEl);
            geocoder.on('result', (e) => {
              const feat = e.result;
              const [lng, lat] = feat.center || [];
              const parts = parseAddressParts(feat);
              const addr = document.getElementById(`eca_address_${cid}`);
              const latEl = document.getElementById(`eca_lat_${cid}`);
              const lngEl = document.getElementById(`eca_lng_${cid}`);
              const numEl = document.getElementById(`eca_number_${cid}`);
              const streetEl = document.getElementById(`eca_street_${cid}`);
              const pcEl = document.getElementById(`eca_postcode_${cid}`);
              const cityEl = document.getElementById(`eca_city_${cid}`);
              if (addr) addr.value = parts.label || addr.value;
              if (latEl) latEl.value = lat || '';
              if (lngEl) lngEl.value = lng || '';
              if (numEl) numEl.value = parts.number || '';
              if (streetEl) streetEl.value = parts.street || '';
              if (pcEl) pcEl.value = parts.postcode || '';
              if (cityEl) cityEl.value = parts.city || '';
            });
            geocoderEl.dataset.inited = '1';
          }
        } catch {}

        // Cancel handler
        const cancelBtn = dialog.querySelector(`[data-cancel-ec="${cid}"]`);
        cancelBtn?.addEventListener('click', () => { try { dialog.close(); } catch { dialog.open = false; } });

        // Submit handler
        const formEl = document.getElementById(`editCarForm-${cid}`);
        formEl?.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const addr = document.getElementById(`eca_address_${cid}`)?.value.trim() || '';
          const latVal = document.getElementById(`eca_lat_${cid}`)?.value || '';
          const lngVal = document.getElementById(`eca_lng_${cid}`)?.value || '';
          const numVal = document.getElementById(`eca_number_${cid}`)?.value.trim() || '';
          const streetVal = document.getElementById(`eca_street_${cid}`)?.value.trim() || '';
          const pcVal = document.getElementById(`eca_postcode_${cid}`)?.value.trim() || '';
          const cityVal = document.getElementById(`eca_city_${cid}`)?.value.trim() || '';
          let latitude = latVal ? parseFloat(latVal) : null;
          let longitude = lngVal ? parseFloat(lngVal) : null;

          // If no coords but address given, forward geocode
          if ((!latitude || !longitude) && addr) {
            try {
              const q = encodeURIComponent(addr);
              const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${encodeURIComponent(mapboxgl.accessToken)}&limit=1&language=fr&country=${encodeURIComponent(window.__MAPBOX_COUNTRIES || 'be,fr')}`;
              const resp = await fetch(url);
              const data = await resp.json();
              const feat = (data.features || [])[0];
              if (feat && feat.center) {
                longitude = parseFloat(feat.center[0]);
                latitude = parseFloat(feat.center[1]);
              }
            } catch {}
          }

          try {
            await fetchJSON(`/api/v1/cars/${cid}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pickup_address: addr,
                pickup_number: numVal,
                pickup_street: streetVal,
                pickup_postcode: pcVal,
                pickup_city: cityVal,
                latitude,
                longitude
              })
            });
            try { dialog.close(); } catch { dialog.open = false; }
            await loadRide();
          } catch (e) {
            alert("Mise à jour de l'adresse impossible");
          }
        }, { once: true });
      });
    });

    // Waiting list
    const waitingCard = document.getElementById('waitingCard');
    const waitingListEl = document.getElementById('waitingList');
    if (waiting_list && waiting_list.length) {
      waitingCard.style.display = 'block';
      waitingListEl.innerHTML = waiting_list.map(w => {
        const options = cars.map(c => `<option value="${c.id}">${c.name || 'Voiture'} (${c.origin || '-'})</option>`).join('');
        return `<li>${w.name}
          <span class="ml-8">
            <select data-assign-select="${w.id}"><option value="">Choisir une voiture</option>${options}</select>
            <button class="btn btn-small" data-assign="${w.id}">Affecter</button>
          </span>
          <button class="btn btn-small btn-danger" data-del="p-${w.id}">Supprimer</button>
        </li>`;
      }).join('');
      // Bind assign
      document.querySelectorAll('[data-assign]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const pid = btn.getAttribute('data-assign');
          const select = document.querySelector(`[data-assign-select="${pid}"]`);
          const cid = select.value;
          if (!cid) return alert('Choisir une voiture');
          try {
            await fetchJSON(`/api/v1/participants/${pid}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ car_id: parseInt(cid, 10) })
            });
            await loadRide();
          } catch (e) { alert('Affectation impossible'); }
        });
      });
    } else {
      waitingCard.style.display = 'none';
      waitingListEl.innerHTML = '';
    }

    document.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del').split('-')[1];
        try {
          await fetchJSON(`/api/v1/participants/${id}`, { method: 'DELETE' });
          await loadRide();
        } catch (e) {
          alert('Suppression impossible');
        }
      });
    });

    document.getElementById('deleteRideBtn').onclick = async () => {
      if (!confirm('Supprimer ce covoiturage ?')) return;
      try {
        await fetchJSON(`/api/v1/rides/${currentRideId}`, { method: 'DELETE' });
        window.location.href = '/app';
      } catch (e) {
        alert('Suppression impossible');
      }
    };

  } catch (e) {
    document.getElementById('rideCard').innerHTML = '<div class="alert alert-warning">Covoiturage introuvable.</div>';
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('pname').value.trim();
  const role = form.querySelector('input[name="prole"]:checked')?.value;
  const seats_offered = parseInt(document.getElementById('pseats').value, 10) || 0;
  const car_id_val = carSelect && carSelect.value ? parseInt(carSelect.value, 10) : null;
  if (!name || !role) return alert('Formulaire incomplet');
  try {
    await fetchJSON(`/api/v1/rides/${currentRideId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, seats_offered, car_id: role === 'passenger' ? car_id_val : null })
    });
    form.reset();
    seatsBox.style.display = 'none';
    carChoiceBox.style.display = 'none';
    await loadRide();
  } catch (e) {
    alert('Erreur lors de l\'ajout');
  }
});

resolveAndInit().then(loadRide).catch(() => {
  document.getElementById('rideCard').innerHTML = '<div class="alert alert-warning">Lien invalide.</div>';
});

// Create car
carForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('car_name').value.trim();
  const origin = document.getElementById('car_origin').value.trim();
  const pickup_address = carAddress ? carAddress.value.trim() : '';
  const departure_time = document.getElementById('car_time').value;
  const seats_total = parseInt(document.getElementById('car_seats').value, 10) || 4;
  const driver_name = document.getElementById('car_driver').value.trim();
  try {
    let latitude = null, longitude = null;
    // Prefer hidden fields set by geocoder or map click
    if (carLatEl && carLngEl && carLatEl.value && carLngEl.value) {
      latitude = parseFloat(carLatEl.value);
      longitude = parseFloat(carLngEl.value);
    } else if (pickup_address) {
      // Fallback: forward geocoding via Mapbox
      try {
        const q = encodeURIComponent(pickup_address);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${encodeURIComponent(mapboxgl.accessToken)}&limit=1&language=fr`;
        const resp = await fetch(url);
        const data = await resp.json();
        const feat = (data.features || [])[0];
        if (feat && feat.center) {
          longitude = parseFloat(feat.center[0]);
          latitude = parseFloat(feat.center[1]);
        }
      } catch {}
    }
    const pickup_number = carNumberEl ? carNumberEl.value.trim() : '';
    const pickup_street = carStreetEl ? carStreetEl.value.trim() : '';
    const pickup_postcode = carPostcodeEl ? carPostcodeEl.value.trim() : '';
    const pickup_city = carCityEl ? carCityEl.value.trim() : '';

    await fetchJSON(`/api/v1/rides/${currentRideId}/cars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, origin, departure_time, seats_total, driver_name, pickup_address, latitude, longitude, pickup_number, pickup_street, pickup_postcode, pickup_city })
    });
    carForm.reset();
    if (carLatEl) carLatEl.value = '';
    if (carLngEl) carLngEl.value = '';
    if (carNumberEl) carNumberEl.value = '';
    if (carStreetEl) carStreetEl.value = '';
    if (carPostcodeEl) carPostcodeEl.value = '';
    if (carCityEl) carCityEl.value = '';
    await loadRide();
  } catch (e) { alert('Création de voiture impossible'); }
});

// Toggle show all cars vs only available
if (toggleShowAllCarsEl) {
  toggleShowAllCarsEl.addEventListener('change', () => {
    showAllCars = toggleShowAllCarsEl.checked;
    renderCarMarkers();
  });
}
