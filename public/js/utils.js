// Utilitaires communs pour ClubCovoit
// Centralise les fonctions répétitives pour alléger le code

// === AUTH & API ===
const Auth = {
  getToken: () => localStorage.getItem('userToken'),
  setToken: (token) => localStorage.setItem('userToken', token),
  removeToken: () => localStorage.removeItem('userToken'),
  isLoggedIn: () => !!localStorage.getItem('userToken'),
  redirectToLogin: () => window.location.href = '/index.html',
  requireAuth: () => {
    if (!Auth.isLoggedIn()) Auth.redirectToLogin();
  },
  logout: () => {
    Auth.removeToken();
    Auth.redirectToLogin();
  }
};

// API helper
const API = {
  baseURL: '/api/v1',
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    
    if (Auth.isLoggedIn()) {
      headers['X-User-Token'] = Auth.getToken();
    }
    
    const config = { ...options, headers };
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  get: (endpoint) => API.request(endpoint),
  post: (endpoint, data) => API.request(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: (endpoint, data) => API.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (endpoint) => API.request(endpoint, { method: 'DELETE' })
};

// === UI HELPERS ===
const UI = {
  // Affichage d'erreurs
  showError: (message, containerId = 'error-container') => {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<div class="alert alert-error">${message}</div>`;
      container.style.display = 'block';
    } else {
      alert(message);
    }
  },
  
  // Affichage de succès
  showSuccess: (message, containerId = 'success-container') => {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<div class="alert alert-success">${message}</div>`;
      container.style.display = 'block';
    }
  },
  
  // Masquer les alertes
  hideAlerts: () => {
    document.querySelectorAll('.alert').forEach(el => el.style.display = 'none');
  },
  
  // Loading state
  setLoading: (element, loading = true) => {
    if (typeof element === 'string') element = document.getElementById(element);
    if (!element) return;
    
    if (loading) {
      element.disabled = true;
      element.textContent = 'Chargement...';
    } else {
      element.disabled = false;
    }
  }
};

// === FORMATTERS ===
const Format = {
  // Tronquer le texte
  truncate: (text, length = 140) => {
    if (!text) return '';
    return text.length > length ? text.slice(0, length - 1) + '…' : text;
  },
  
  // Formater une date
  date: (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR');
  },
  
  // Formater une heure
  time: (timeString) => {
    if (!timeString) return '';
    return timeString.slice(0, 5); // HH:MM
  },
  
  // Formater date + heure
  datetime: (dateString, timeString) => {
    const date = Format.date(dateString);
    const time = Format.time(timeString);
    return time ? `${date} à ${time}` : date;
  }
};

// === URL HELPERS ===
const URL = {
  getParam: (name) => new URLSearchParams(location.search).get(name),
  setParam: (name, value) => {
    const url = new URL(location);
    url.searchParams.set(name, value);
    history.pushState({}, '', url);
  },
  redirect: (path) => window.location.href = path
};

// === FORM HELPERS ===
const Form = {
  // Récupérer les données d'un formulaire
  getData: (formElement) => {
    const formData = new FormData(formElement);
    const data = {};
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }
    return data;
  },
  
  // Valider un email
  isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  
  // Reset form
  reset: (formElement) => {
    if (typeof formElement === 'string') formElement = document.getElementById(formElement);
    if (formElement) formElement.reset();
  }
};

// === COMPONENTS ===
const Components = {
  // Badge pour propriétaire
  ownerBadge: (isOwner) => isOwner ? '<span class="badge badge-owner">propriétaire</span>' : '',
  
  // Carte de statistiques
  statCard: (number, label) => `
    <div class="stat-card">
      <div class="stat-number">${number != null ? number : '-'}</div>
      <div class="stat-label">${label}</div>
    </div>
  `,
  
  // Ligne de boutons
  buttonRow: (buttons) => `<div class="btn-row">${buttons.join('')}</div>`,
  
  // Bouton standard
  button: (text, href, className = 'btn btn-small') => 
    `<a class="${className}" href="${href}">${text}</a>`
};

// Auto-setup pour les pages qui nécessitent une auth
if (document.body.dataset.requireAuth !== 'false') {
  document.addEventListener('DOMContentLoaded', () => {
    Auth.requireAuth();
    
    // Setup logout button automatiquement
    document.getElementById('logoutBtn')?.addEventListener('click', Auth.logout);
  });
}

// Export global
window.ClubCovoit = { Auth, API, UI, Format, URL, Form, Components };
