/**
 * GitHub API Client
 * Utilise le repo GitHub comme base de données
 */
class GitHubAPI {
  constructor(config) {
    this.config = config.GITHUB;
    this.cache = new Map();
  }

  setToken(token) {
    this.config.token = token;
  }

  hasToken() {
    return !!this.config.token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.config.apiBase}${endpoint}`;
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.config.token) {
      headers['Authorization'] = `token ${this.config.token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Récupère le contenu d'un fichier
   */
  async getFile(path) {
    const cacheKey = `file:${path}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await this.request(
        `/repos/${this.config.owner}/${this.config.repo}/contents/${path}?ref=${this.config.branch}`
      );
      const content = atob(data.content.replace(/\s/g, ''));
      const parsed = JSON.parse(content);
      this.cache.set(cacheKey, { content: parsed, sha: data.sha });
      return { content: parsed, sha: data.sha };
    } catch (err) {
      console.warn(`File ${path} not found:`, err.message);
      return null;
    }
  }

  /**
   * Crée ou met à jour un fichier
   */
  async saveFile(path, content, message = 'Update file', sha = null) {
    if (!this.hasToken()) {
      throw new Error('Token requis pour écrire dans le repo');
    }

    const body = {
      message,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
      branch: this.config.branch,
    };

    if (sha) body.sha = sha;

    const result = await this.request(
      `/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
      { method: 'PUT', body: JSON.stringify(body) }
    );

    this.cache.delete(`file:${path}`);
    return result;
  }

  /**
   * Liste les fichiers d'un dossier
   */
  async listFiles(path) {
    try {
      const files = await this.request(
        `/repos/${this.config.owner}/${this.config.repo}/contents/${path}?ref=${this.config.branch}`
      );
      return Array.isArray(files) ? files : [];
    } catch (err) {
      return [];
    }
  }

  /**
   * Récupère tous les produits
   */
  async getProducts() {
    const data = await this.getFile('data/products.json');
    return data?.content || { products: [] };
  }

  /**
   * Sauvegarde un produit
   */
  async saveProduct(product) {
    const data = await this.getProducts();
    const products = data.products || [];
    const idx = products.findIndex(p => p.id === product.id);

    if (idx >= 0) {
      products[idx] = { ...products[idx], ...product };
    } else {
      products.push({ ...product, createdAt: new Date().toISOString() });
    }

    return this.saveFile('data/products.json', { products }, 
      idx >= 0 ? `Update product ${product.id}` : `Add product ${product.id}`,
      data.sha);
  }

  /**
   * Crée une nouvelle commande
   */
  async createOrder(order) {
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const orderWithId = {
      ...order,
      id: orderId,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    const filename = `data/orders/${orderId}.json`;
    await this.saveFile(filename, orderWithId, `New order ${orderId}`);

    // Mise à jour de l'index des commandes
    await this.updateOrdersIndex(orderId, orderWithId);

    return orderWithId;
  }

  /**
   * Met à jour l'index des commandes
   */
  async updateOrdersIndex(orderId, orderData) {
    const data = await this.getFile('data/orders-index.json').catch(() => null);
    const index = data?.content || { orders: [] };
    index.orders.unshift({
      id: orderId,
      customer: orderData.customer?.email,
      total: orderData.total,
      status: orderData.status,
      date: orderData.createdAt,
    });
    // Garder seulement les 100 dernières
    index.orders = index.orders.slice(0, 100);

    await this.saveFile('data/orders-index.json', index,
      `Update orders index`, data?.sha);
  }

  /**
   * Liste toutes les commandes (admin)
   */
  async getOrders() {
    const files = await this.listFiles('data/orders');
    const orders = [];

    for (const file of files) {
      if (file.name.endsWith('.json')) {
        const data = await this.getFile(file.path);
        if (data?.content) orders.push(data.content);
      }
    }

    return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Crée une Issue GitHub (pour déclencher les Actions)
   */
  async createIssue(title, body, labels = []) {
    return this.request(
      `/repos/${this.config.owner}/${this.config.repo}/issues`,
      {
        method: 'POST',
        body: JSON.stringify({ title, body, labels }),
      }
    );
  }

  /**
   * Déclenche un workflow via repository_dispatch
   */
  async triggerWorkflow(eventType, payload = {}) {
    return this.request(
      `/repos/${this.config.owner}/${this.config.repo}/dispatches`,
      {
        method: 'POST',
        body: JSON.stringify({ event_type: eventType, client_payload: payload }),
      }
    );
  }

  /**
   * Récupère les infos utilisateur
   */
  async getUser() {
    return this.request('/user');
  }

  clearCache() { this.cache.clear(); }
}

window.GitHubAPI = GitHubAPI;
