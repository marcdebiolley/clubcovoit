// public/js/login.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      alert("Merci de remplir l'email et le mot de passe.");
      return;
    }

    try {
      // même origine que la page : https://clubcovoit.com/api/v1/auth/login
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        alert(data.error || "Email ou mot de passe invalide.");
        return;
      }

      // on stocke le token + user pour la suite
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("currentUser", JSON.stringify(data.user));

      // redirection vers la page clubs
      window.location.href = "/clubs.html";
    } catch (error) {
      console.error("Erreur réseau", error);
      alert("Erreur réseau, merci de réessayer.");
    }
  });
});
