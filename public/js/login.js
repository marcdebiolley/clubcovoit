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
    const data = await CC.API.post('/auth/login', {
      email: formData.email.trim(),
      password: formData.password
    });
    
    CC.Auth.setToken(data.token);
    CC.URL.redirect('/index.html');
  } catch (error) {
    CC.UI.showError('Identifiants invalides');
  } finally {
    CC.UI.setLoading(submitBtn, false);
  }
});
