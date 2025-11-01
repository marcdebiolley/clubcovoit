// Inject reusable navbar component into pages
(function () {
  function mountNavbar(html) {
    // Remove any existing navbar to avoid duplicates
    var existing = document.querySelector('.navbar');
    if (existing) existing.remove();

    // Prefer explicit mount point
    var mount = document.getElementById('app-navbar') || document.getElementById('app-header');
    if (mount) {
      mount.insertAdjacentHTML('afterbegin', html);
    } else {
      document.body.insertAdjacentHTML('afterbegin', html);
    }

    // Active link highlight by path
    try {
      var path = location.pathname || '/';
      document.querySelectorAll('.nav a').forEach(function (a) {
        if (a.getAttribute('href') === path) a.classList.add('active');
      });
    } catch {}

    // Logout (desktop)
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        try { localStorage.removeItem('userToken'); } catch {}
        window.location.href = '/index.html';
      });
    }
    // Logout (mobile)
    var logoutBtnMobile = document.getElementById('logoutBtnMobile');
    if (logoutBtnMobile) {
      logoutBtnMobile.addEventListener('click', function () {
        try { localStorage.removeItem('userToken'); } catch {}
        window.location.href = '/index.html';
      });
    }

    // Mobile menu toggle
    var mobileBtn = document.getElementById('mobileMenuBtn');
    var mobileMenu = document.getElementById('mobileMenu');
    if (mobileBtn && mobileMenu) {
      mobileBtn.addEventListener('click', function () {
        mobileBtn.classList.toggle('active');
        mobileMenu.classList.toggle('active');
      });
      // Close on navigation
      mobileMenu.querySelectorAll('a').forEach(function (lnk) {
        lnk.addEventListener('click', function () {
          mobileBtn.classList.remove('active');
          mobileMenu.classList.remove('active');
        });
      });
    }

    // Toggle items based on auth state
    try {
      var token = null; try { token = localStorage.getItem('userToken'); } catch {}
      var isLogged = !!token;

      // Desktop links
      var linkClubs = document.querySelector('.nav a[href="/clubs.html"]');
      var linkProfile = document.querySelector('.nav a[href="/profile.html"]');
      var btnLogout = document.getElementById('logoutBtn');
      var linkLogin = document.getElementById('loginLink');

      if (isLogged) {
        if (linkClubs) linkClubs.style.display = '';
        if (linkProfile) linkProfile.style.display = '';
        if (btnLogout) btnLogout.style.display = '';
        if (linkLogin) linkLogin.style.display = 'none';
        var dd = document.getElementById('loginDropdown'); if (dd) {}
        var wrap = linkLogin ? linkLogin.closest('.login-wrap') : null; if (wrap) wrap.classList.remove('open');
      } else {
        if (linkClubs) linkClubs.style.display = 'none';
        if (linkProfile) linkProfile.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'none';
        if (linkLogin) linkLogin.style.display = '';
      }

      // Mobile menu links
      var mClubs = document.querySelector('#mobileMenu a[href="/clubs.html"]');
      var mProfile = document.querySelector('#mobileMenu a[href="/profile.html"]');
      var mLogin = document.getElementById('loginLinkMobile');
      var btnLogoutMobile = document.getElementById('logoutBtnMobile');

      if (isLogged) {
        if (mClubs) mClubs.style.display = '';
        if (mProfile) mProfile.style.display = '';
        if (btnLogoutMobile) btnLogoutMobile.style.display = '';
        if (mLogin) mLogin.style.display = 'none';
      } else {
        if (mClubs) mClubs.style.display = 'none';
        if (mProfile) mProfile.style.display = 'none';
        if (btnLogoutMobile) btnLogoutMobile.style.display = 'none';
        if (mLogin) mLogin.style.display = '';
      }
    } catch {}

    // Login dropdown toggle + submit
    try {
      var loginLink = document.getElementById('loginLink');
      var loginDropdown = document.getElementById('loginDropdown');
      var loginWrap = loginLink ? loginLink.closest('.login-wrap') : null;
      var loginForm = document.getElementById('navbarLoginForm');
      var loginErr = document.getElementById('navLoginError');
      if (loginLink && loginDropdown) {
        loginLink.addEventListener('click', function (e) {
          e.preventDefault();
          var isOpen = loginWrap && loginWrap.classList.contains('open');
          if (loginWrap) loginWrap.classList.toggle('open', !isOpen);
          loginLink.setAttribute('aria-expanded', String(!isOpen));
        });
        document.addEventListener('click', function (e) {
          if (!loginDropdown.contains(e.target) && !loginWrap.contains(e.target)) {
            loginLink.setAttribute('aria-expanded', 'false');
            if (loginWrap) loginWrap.classList.remove('open');
          }
        });
      }
      if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
          e.preventDefault();
          var email = (document.getElementById('nav_email')||{}).value || '';
          var password = (document.getElementById('nav_password')||{}).value || '';
          if (!email || !password) return;
          fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), password: password })
          }).then(function (res) { return res.text().then(function (t){ return { ok: res.ok, text: t }; }); })
            .then(function (res) {
              var data = {}; try { data = JSON.parse(res.text); } catch {}
              if (!res.ok || !data.token) {
                if (loginErr) { loginErr.textContent = (data.error || data.details || 'Connexion impossible'); loginErr.style.display = 'block'; }
                return;
              }
              try { localStorage.setItem('userToken', data.token); } catch {}
              // Refresh nav state
              if (loginWrap) loginWrap.classList.remove('open');
              if (loginErr) loginErr.style.display = 'none';
              // Reload page to reflect authenticated sections requirements
              window.location.reload();
            })
            .catch(function () { if (loginErr) { loginErr.textContent = 'Connexion impossible'; loginErr.style.display = 'block'; } });
        });
      }
    } catch {}
  }

  fetch('/navbar.html', { credentials: 'same-origin' })
    .then(function (res) { return res.text(); })
    .then(function (html) { mountNavbar(html); })
    .catch(function () {});
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
