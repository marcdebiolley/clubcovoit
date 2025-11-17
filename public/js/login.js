// Utilise les utilitaires communs sans redéclarer les constantes globales
const CC = window.ClubCovoit;

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = CC.Form.getData(e.target);
  
  if (!CC.Form.isValidEmail(formData.email)) {
    CC.UI.showError('Email invalide');
    return;
  }
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  CC.UI.setLoading(submitBtn, true);
  
  try {
    // Appel direct au script PHP sur Plesk
    const response = await fetch('/api/v1/auth/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email.trim(),
        password: formData.password
      })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    
    CC.Auth.setToken(data.token);
    CC.URL.redirect('/index.html');
  } catch (error) {
    CC.UI.showError('Identifiants invalides');
  } finally {
    CC.UI.setLoading(submitBtn, false);
  }
});
