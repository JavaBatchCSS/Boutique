/**
 * Configuration de la boutique
 * ⚠️ Remplacez ces valeurs par les vôtres
 */
const CONFIG = {
  // GitHub
  GITHUB: {
    owner: 'JavaBatchCSS',              // 👈 Votre nom d'utilisateur GitHub
    repo: 'Boutique',                    // 👈 Nom du repo
    branch: 'main',
    token: '',                              // Token utilisateur (localStorage)
    apiBase: 'https://api.github.com',
    rawBase: 'https://raw.githubusercontent.com',
  },

  // Boutique
  SHOP: {
    name: 'GitHub Shop',
    currency: '€',
    currencySymbol: '€',
    taxRate: 0.20,                          // TVA 20%
    shippingCost: 5.99,
    freeShippingThreshold: 50,
    contactEmail: 'contact@example.com',
  },

  // Paiement
  STRIPE: {
    publicKey: 'pk_test_VOTRE_CLE_PUBLIQUE',  // 👈 À remplacer
  },

  // Admin
  ADMIN: {
    allowedUsers: ['JavaBatchCSS'],        // 👈 Admins autorisés
    githubOAuthClientId: '',                  // Pour OAuth GitHub
  },

  // Features
  FEATURES: {
    enableReviews: true,
    enableWishlist: true,
    enableCoupons: true,
    enableInventory: true,
    darkMode: true,
    multiLanguage: true,
  },

  // Catégories
  CATEGORIES: [
    { id: 'all', name: 'Tous', icon: '🛍️' },
    { id: 'electronics', name: 'Électronique', icon: '💻' },
    { id: 'clothing', name: 'Vêtements', icon: '👕' },
    { id: 'home', name: 'Maison', icon: '🏠' },
    { id: 'books', name: 'Livres', icon: '📚' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
    { id: 'beauty', name: 'Beauté', icon: '💄' },
  ],

  // Pagination
  ITEMS_PER_PAGE: 12,
};

// Détection automatique du repo depuis l'URL
if (window.location.hostname.includes('github.io')) {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length >= 1) {
    CONFIG.GITHUB.repo = pathParts[0];
  }
}

window.CONFIG = CONFIG;
