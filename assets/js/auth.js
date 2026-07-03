/**
 * Authentification via GitHub OAuth
 */
class Auth {
  constructor() {
    this.user = null;
    this.token = localStorage.getItem('gh-shop-token');
    if (this.token) githubAPI.setToken(this.token);
  }

  isAdmin() {
    return this.user && CONFIG.ADMIN.allowedUsers.includes(this.user.login);
  }

  isLoggedIn() {
    return !!this.user;
  }

  async loginWithToken(token) {
    githubAPI.setToken(token);
    try {
      this.user = await githubAPI.getUser();
      localStorage.setItem('gh-shop-token', token);
      showToast(`Bienvenue ${this.user.login} ! 👋`, 'success');
      return this.user;
    } catch (err) {
      githubAPI.setToken(null);
      localStorage.removeItem('gh-shop-token');
      throw new Error('Token invalide');
    }
  }

  logout() {
    this.user = null;
    githubAPI.setToken(null);
    localStorage.removeItem('gh-shop-token');
    showToast('Déconnecté', 'info');
  }

  promptTokenLogin() {
    const token = prompt('🔐 Collez votre GitHub Personal Access Token (scope: repo) :');
    if (token) {
      this.loginWithToken(token).catch(err => showToast(err.message, 'error'));
    }
  }
}

window.auth = new Auth();

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('userBtn')?.addEventListener('click', () => {
    if (auth.isLoggedIn()) {
      if (confirm(`Connecté en tant que ${auth.user.login}\n\nSe déconnecter ?`)) {
        auth.logout();
      }
    } else {
      auth.promptTokenLogin();
    }
  });
});
