// Simple navbar loader
(function () {
  // Prevent multiple loads
  if (window.__navbarLoaded) return;
  window.__navbarLoaded = true;

  function loadNavbar(html) {
    // Remove existing navbar
    var existing = document.querySelector('.navbar');
    if (existing) existing.remove();

    // Mount navbar
    var mount = document.getElementById('app-navbar');
    if (mount) {
      mount.innerHTML = html;
    } else {
      document.body.insertAdjacentHTML('afterbegin', html);
    }

    // Highlight active page
    var path = location.pathname || '/';
    document.querySelectorAll('.nav-links a').forEach(function (link) {
      if (link.getAttribute('href') === path) {
        link.classList.add('active');
      }
    });

    // Handle authentication state
    var token = null;
    try { 
      token = localStorage.getItem('userToken'); 
    } catch {}
    var isLoggedIn = !!token;

    var loginLink = document.getElementById('loginLink');
    var logoutBtn = document.getElementById('logoutBtn');
    var clubsLink = document.getElementById('clubsLink');

    if (isLoggedIn) {
      // User is logged in
      if (loginLink) loginLink.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (clubsLink) clubsLink.style.display = 'inline-block';
    } else {
      // User is not logged in
      if (loginLink) loginLink.style.display = 'inline-block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (clubsLink) clubsLink.style.display = 'inline-block'; // Keep clubs visible but will redirect
    }

    // Logout functionality
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        try { 
          localStorage.removeItem('userToken'); 
        } catch {}
        window.location.href = '/index.html';
      });
    }
  }

  // Load navbar
  fetch('/navbar-v2.html')
    .then(function (res) { return res.text(); })
    .then(function (html) { loadNavbar(html); })
    .catch(function () { console.log('Navbar loading failed'); });
})();

(function(){
  try {
    var k = 'cookieConsent';
    var v = localStorage.getItem(k);
    if (v === 'accepted') return;
    var b = document.createElement('div');
    b.className = 'cookie-banner';
    b.innerHTML = '<div class="cookie-inner">' +
      '<div class="cookie-text">Nous utilisons des cookies pour améliorer votre expérience. <a class="link" href="/about.html">En savoir plus</a></div>' +
      '<div class="cookie-actions"><button id="cookieAccept" class="btn btn-primary">Accepter</button></div>' +
    '</div>';
    document.body.appendChild(b);
    var accept = document.getElementById('cookieAccept');
    if (accept) {
      accept.addEventListener('click', function(){
        try { localStorage.setItem(k, 'accepted'); } catch {}
        try { window.__loadAnalytics && window.__loadAnalytics(); } catch {}
        if (b && b.parentNode) b.parentNode.removeChild(b);
      });
    }
  } catch {}
})();

// Global head utilities: favicon + analytics (Plausible)
(function(){
  try {
    // Ensure favicon on all pages
    var hasFav = !!document.querySelector('link[rel="icon"]');
    if (!hasFav) {
      var link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      link.href = '/assets/favicon.svg';
      document.head.appendChild(link);
    }

    // Analytics loader (Plausible)
    window.__loadAnalytics = window.__loadAnalytics || function(){
      if (window.__plausibleLoaded) return;
      var s = document.createElement('script');
      s.defer = true;
      s.setAttribute('data-domain', 'clubcovoit.fr');
      s.src = 'https://plausible.io/js/script.js';
      document.head.appendChild(s);
      window.__plausibleLoaded = true;
    };
    if (localStorage.getItem('cookieConsent') === 'accepted') {
      window.__loadAnalytics();
    }

    // Font Awesome (Free) - inject once globally
    var hasFA = !!document.querySelector('link[href*="font-awesome"], link[href*="fontawesome"], link[href*="/css/all.min.css"]');
    if (!hasFA) {
      var fa = document.createElement('link');
      fa.rel = 'stylesheet';
      // Use jsDelivr without SRI to avoid mismatch blocking
      fa.href = 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.2/css/all.min.css';
      document.head.appendChild(fa);
    }
  } catch {}
})();
