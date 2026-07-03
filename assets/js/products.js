/**
 * Module Produits
 */
class ProductService {
  constructor() {
    this.products = [];
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return this.products;

    try {
      // Tente de charger depuis GitHub
      const data = await githubAPI.getProducts();
      this.products = data.products || [];
    } catch (err) {
      console.warn('Fallback to local products:', err.message);
      this.products = this.getDefaultProducts();
    }

    this.loaded = true;
    return this.products;
  }

  getDefaultProducts() {
    // Produits de démo en cas d'échec
    return [
      {
        id: 'demo-1', title: 'Casque Audio Bluetooth', price: 79.99, originalPrice: 129.99,
        category: 'electronics', emoji: '🎧', stock: 25, rating: 4.5, reviews: 128,
        featured: true, badge: '-38%', description: 'Casque sans fil avec réduction de bruit active, autonomie 30h.',
        features: ['Bluetooth 5.3', 'ANC', '30h autonomie', 'Charge rapide'],
      },
      {
        id: 'demo-2', title: 'Montre Connectée Sport', price: 149.00, originalPrice: 199.00,
        category: 'electronics', emoji: '⌚', stock: 15, rating: 4.7, reviews: 89,
        featured: true, badge: 'NEW', description: 'Montre sport étanche avec GPS et suivi cardiaque.',
        features: ['GPS intégré', 'Étanche 50m', 'Cardio', '14 jours batterie'],
      },
      {
        id: 'demo-3', title: 'T-shirt Bio Premium', price: 29.99, originalPrice: 39.99,
        category: 'clothing', emoji: '👕', stock: 100, rating: 4.3, reviews: 256,
        description: 'T-shirt 100% coton bio, coupe regular, plusieurs couleurs.',
        features: ['Coton bio', 'Coupe regular', 'XS au XXL', '7 couleurs'],
      },
      {
        id: 'demo-4', title: 'Lampe LED Design', price: 49.90, originalPrice: 69.90,
        category: 'home', emoji: '💡', stock: 40, rating: 4.6, reviews: 67,
        featured: true, description: 'Lampe LED intelligente avec contrôle par application.',
        features: ['16M couleurs', 'WiFi', 'Compatible Alexa', 'Économie énergie'],
      },
      {
        id: 'demo-5', title: 'Roman Bestseller 2024', price: 19.99, originalPrice: 24.99,
        category: 'books', emoji: '📚', stock: 200, rating: 4.8, reviews: 412,
        description: 'Le roman phénomène de l\'année, disponible en broché et numérique.',
        features: ['432 pages', 'Éditeur : Plon', 'ISBN : 978-...', 'Aussi en e-book'],
      },
      {
        id: 'demo-6', title: 'Chaussures Running Pro', price: 119.00, originalPrice: 159.00,
        category: 'sports', emoji: '👟', stock: 60, rating: 4.7, reviews: 198,
        featured: true, badge: '-25%', description: 'Chaussures running avec amorti premium et mesh respirant.',
        features: ['Amorti EVA', 'Mesh respirant', 'Semelle carbone', 'Drop 8mm'],
      },
      {
        id: 'demo-7', title: 'Sac à Dos Urbain', price: 59.00, originalPrice: 89.00,
        category: 'clothing', emoji: '🎒', stock: 35, rating: 4.5, reviews: 154,
        description: 'Sac à dos élégant avec compartiment laptop 15" et USB.',
        features: ['Compartiment laptop 15"', 'Port USB', 'Anti-vol', 'Imperméable'],
      },
      {
        id: 'demo-8', title: 'Crème Visage Bio', price: 34.50, originalPrice: 45.00,
        category: 'beauty', emoji: '🧴', stock: 80, rating: 4.4, reviews: 92,
        description: 'Crème hydratante 100% naturelle, tous types de peau.',
        features: ['99% naturel', 'Vegan', '50ml', 'Sans paraben'],
      },
    ];
  }

  findById(id) {
    return this.products.find(p => p.id === id);
  }

  search(query) {
    const q = query.toLowerCase();
    return this.products.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  filterByCategory(categoryId) {
    if (!categoryId || categoryId === 'all') return this.products;
    return this.products.filter(p => p.category === categoryId);
  }

  filterByPrice(min, max) {
    return this.products.filter(p => p.price >= min && p.price <= max);
  }

  getFeatured(limit = 4) {
    return this.products.filter(p => p.featured).slice(0, limit);
  }

  getRelated(productId, limit = 4) {
    const product = this.findById(productId);
    if (!product) return [];
    return this.products
      .filter(p => p.id !== productId && p.category === product.category)
      .slice(0, limit);
  }

  createCard(product) {
    const inWishlist = window.Wishlist.has(product.id);
    const discount = product.originalPrice ?
      Math.round((1 - product.price / product.originalPrice) * 100) : 0;

    return `
      <article class="product-card" data-id="${product.id}">
        ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ''}
        <button class="product-wishlist ${inWishlist ? 'active' : ''}"
                onclick="toggleWishlist('${product.id}', this)" aria-label="Favoris">
          ${inWishlist ? '❤️' : '🤍'}
        </button>
        <a href="#/product/${product.id}" class="product-image">
          ${product.image ?
            (product.image.startsWith('http') ?
              `<img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy">` :
              `<span>${product.image}</span>`) :
            `<span>${product.emoji || '📦'}</span>`}
        </a>
        <div class="product-info">
          <div class="product-category">${getCategoryName(product.category)}</div>
          <a href="#/product/${product.id}" class="product-title">${escapeHtml(product.title)}</a>
          <div class="product-rating">
            ${'★'.repeat(Math.floor(product.rating || 0))}${'☆'.repeat(5 - Math.floor(product.rating || 0))}
            <span style="color: var(--text-muted); margin-left: 0.25rem;">(${product.reviews || 0})</span>
          </div>
          <div class="product-price">
            <span class="current">${formatPrice(product.price)}</span>
            ${product.originalPrice ? `<span class="original">${formatPrice(product.originalPrice)}</span>` : ''}
            ${discount ? `<span style="color: var(--success); font-size: 0.85rem; font-weight: 600;">-${discount}%</span>` : ''}
          </div>
          <div class="product-actions">
            <button class="btn btn-primary" onclick="addToCart('${product.id}')">
              🛒 Ajouter
            </button>
            <a href="#/product/${product.id}" class="btn btn-secondary">👁️</a>
          </div>
        </div>
      </article>
    `;
  }
}

function getCategoryName(catId) {
  const cat = CONFIG.CATEGORIES.find(c => c.id === catId);
  return cat ? cat.name : catId;
}

function toggleWishlist(productId, btn) {
  const added = window.Wishlist.toggle(productId);
  if (btn) {
    btn.classList.toggle('active', added);
    btn.innerHTML = added ? '❤️' : '🤍';
  }
  showToast(added ? 'Ajouté aux favoris ❤️' : 'Retiré des favoris', 'success');
}

function addToCart(productId) {
  const product = productService.findById(productId);
  if (!product) return;
  if (product.stock <= 0) {
    showToast('Produit en rupture de stock', 'error');
    return;
  }
  window.Cart.add(product);
  showToast(`${product.title} ajouté au panier 🛒`, 'success');
}

window.productService = new ProductService();
