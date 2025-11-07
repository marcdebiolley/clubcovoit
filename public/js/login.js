// Utilise les utilitaires communs
const { Auth, API, UI, Form } = window.ClubCovoit;

// Rediriger si déjà connecté
if (Auth.isLoggedIn()) {
  URL.redirect('/index.html');
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = Form.getData(e.target);
  
  if (!Form.isValidEmail(formData.email)) {
    UI.showError('Email invalide');
    return;
  }
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  UI.setLoading(submitBtn, true);
  
  try {
    const data = await API.post('/auth/login', {
      email: formData.email.trim(),
      password: formData.password
    });
    
    Auth.setToken(data.token);
    URL.redirect('/index.html');
  } catch (error) {
    UI.showError('Identifiants invalides');
  } finally {
    UI.setLoading(submitBtn, false);
  }
});
