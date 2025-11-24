// public/js/login.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const email = (formData.get("email") || "").toString().trim();
    const password = (formData.get("password") || "").toString();

    console.log("login submit values =>", { email, passwordLength: password.length });

    // Vérification basique juste pour éviter les champs vides
    if (!email || !password) {
      alert("Merci de remplir l'email et le mot de passe.");
      return;
    }

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 200) {
        const data = await res.json();

        // On stocke le token + user pour les autres pages
        localStorage.setItem("userToken", data.token);   // pour l'ancien code
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("currentUser", JSON.stringify(data.user));

        // Redirection vers la liste des clubs (ou autre)
        window.location.href = "/clubs.html";
      } else if (res.status === 401) {
        alert("Email ou mot de passe incorrect.");
      } else {
        console.error("Erreur login", res.status);
        alert("Erreur serveur, merci de réessayer.");
      }
    } catch (err) {
      console.error("Erreur réseau", err);
      alert("Impossible de contacter le serveur. Vérifie ta connexion.");
    }
  });
});
