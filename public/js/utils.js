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

// === NAVBAR LOADER ===
document.addEventListener('DOMContentLoaded', async () => {
  const placeholder = document.getElementById('navbar-placeholder');
  if (!placeholder) return;

  try {
    const res = await fetch('/navbar.html', { cache: 'no-cache' });
    if (!res.ok) return;
    const html = await res.text();
    placeholder.innerHTML = html;

    // Après injection, appliquer la logique d'auth et de lien actif
    try {
      const token = Auth.getToken();
      const isLoggedIn = !!token;
      const navbar = placeholder.querySelector('.navbar');
      if (!navbar) return;

      const nav = navbar.querySelector('.nav-links');
      // Dropdown / modal de connexion quand l'utilisateur n'est pas connecté
      if (!isLoggedIn && nav) {
        const loginLink = nav.querySelector('#navLoginLink') || nav.querySelector('a[href="/login.html"]');
        if (loginLink) {
          let loginDialog = document.getElementById('navLoginDialog');
          if (!loginDialog) {
            loginDialog = document.createElement('dialog');
            loginDialog.id = 'navLoginDialog';
            loginDialog.innerHTML = `
              <form id="navLoginForm" method="dialog" class="form">
                <h3>Connexion</h3>
                <div class="form-group">
                  <label for="nav_email">Email</label>
                  <input id="nav_email" type="email" autocomplete="email" required />
                </div>
                <div class="form-group">
                  <label for="nav_password">Mot de passe</label>
                  <input id="nav_password" type="password" autocomplete="current-password" required />
                </div>
                <div class="nav modal-actions">
                  <button type="button" class="btn btn-secondary" id="navLoginCancel">Annuler</button>
                  <button class="btn" type="submit">Se connecter</button>
                </div>
                <p class="secondary" style="margin-top:8px;font-size:0.9rem;">
                  Pas encore de compte ? <a href="/signup.html">Créer un compte</a>
                </p>
              </form>
            `;
            document.body.appendChild(loginDialog);

            const form = loginDialog.querySelector('#navLoginForm');
            const cancelBtn = loginDialog.querySelector('#navLoginCancel');
            cancelBtn?.addEventListener('click', () => loginDialog.close());
            form?.addEventListener('submit', async (e) => {
              e.preventDefault();
              const email = (document.getElementById('nav_email').value || '').trim();
              const password = document.getElementById('nav_password').value || '';
              if (!email || !password) {
                alert("Merci de remplir l'email et le mot de passe.");
                return;
              }
              try {
                const res = await fetch('/api/v1/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, password })
                });
                if (res.status === 200) {
                  const data = await res.json();
                  try {
                    localStorage.setItem('userToken', data.token);
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                  } catch {}
                  loginDialog.close();
                  window.location.href = '/clubs.html';
                } else if (res.status === 401) {
                  alert('Email ou mot de passe incorrect.');
                } else {
                  alert('Erreur serveur, merci de réessayer.');
                }
              } catch (err) {
                console.error('Erreur réseau login navbar', err);
                alert('Impossible de contacter le serveur. Vérifie ta connexion.');
              }
            });
          }
          loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            try {
              loginDialog.showModal();
            } catch {
              loginDialog.open = true;
            }
          });
        }
      }

      if (isLoggedIn && nav) {
        nav.innerHTML = `
          <a href="/index.html">Accueil</a>
          <a href="/clubs.html">Clubs</a>
          <a href="/profile.html">Profil</a>
          <a href="/about.html">About</a>
          <a href="#" id="logoutLink">Déconnexion</a>
        `;

        const logoutLink = navbar.querySelector('#logoutLink');
        if (logoutLink) {
          logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
          });
        }
      }

      const path = location.pathname || '/';
      navbar.querySelectorAll('.nav-links a').forEach((link) => {
        if (link.getAttribute('href') === path) {
          link.classList.add('active');
        }
      });
    } catch (e) {
      console.error('Navbar auth/init error', e);
    }
  } catch (e) {
    console.error('Erreur chargement navbar', e);
  }
});

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
