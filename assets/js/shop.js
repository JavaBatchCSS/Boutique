/**
 * Application principale - Router & Pages
 */

// =====================
// Router
// =====================
class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  add(path, handler) {
    this.routes[path] = handler;
  }

  async handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, ...params] = hash.split('/').filter(Boolean);

    // Match exact routes
    let handler = this.routes[path || '/'];
    let routeParams = {};

    // Match patterns like /product/:id
    if (!handler) {
      for (const pattern in this.routes) {
        if (pattern.includes(':')) {
          const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '([^/]+)') + '$');
          const match = path.match(regex);
          if (match) {
            handler = this.routes[pattern];
            const paramNames = (pattern.match(/:[^/]+/g) || []).map(p => p.slice(1));
            routeParams = {};
            paramNames.forEach((name, i) => routeParams[name] = match[i + 1]);
            break;
          }
        }
      }
    }

    this.currentRoute = path || '/';
    const app = document.getElementById('app');

    if (handler) {
      try {
        const html = await handler(routeParams, params);
        app.innerHTML = html;
        if (handler.postRender) handler.postRender(routeParams);
      } catch (err) {
        console.error('Route error:', err);
        app.innerHTML = renderError(err);
      }
    } else {
      app.innerHTML = render404();
    }

    window.scrollTo(0, 0);
    this.updateActiveLinks();
  }

  updateActiveLinks() {
    document.querySelectorAll('.nav a').forEach(link => {
      const route = link.getAttribute('data-route');
      link.classList.toggle('active', route === '/' + this.currentRoute);
    });
  }
}

const router = new Router();

// =====================
// Pages
// =====================
router.add('/', async () => {
  await productService.load();
  return `
    ${renderHero()}
    ${renderFeatures()}
    ${renderFeatured()}
    ${renderNewsletter()}
  `;
});

router.add('/shop', async (params, query) => {
  await productService.load();
  const searchParams = new URLSearchParams(query.join('/').split('?')[1] || '');
  const category = searchParams.get('cat') || 'all';
  const search = searchParams.get('q') || '';
  return renderShop(category, search);
});

router.add('/product/:id', async ({ id }) => {
  await productService.load();
  const product = productService.findById(id);
  if (!product) return render404();
  return renderProductDetail(product);
});

router.add('/checkout', async () => {
  if (window.Cart.items.length === 0) {
    return `
      <div class="container section" style="text-align:center;">
        <h1>🛒 Panier vide</h1>
        <p style="margin: 1rem 0;">Ajoutez des produits avant de passer commande.</p>
        <a href="#/shop" class="btn btn-primary">Voir la boutique</a>
      </div>`;
  }
  return renderCheckout();
});

router.add('/order/:id', async ({ id }) => renderOrderConfirmation(id));
router.add('/about', () => renderAbout());
router.add('/contact', () => renderContact());
router.add('/faq', () => renderFAQ());
router.add('/shipping', () => renderShipping());
router.add('/returns', () => renderReturns());
router.add('/admin', () => renderAdmin());

// =====================
// Renderers
// =====================
function renderHero() {
  return `
    <section class="hero">
      <div class="hero-content">
        <h1>🛍️ Bienvenue sur GitHub Shop</h1>
        <p>Découvrez notre sélection de produits premium, livrés chez vous en 48h</p>
        <div class="hero-cta">
          <a href="#/shop" class="btn btn-outline btn-lg">Voir les produits</a>
          <a href="#/about" class="btn btn-outline btn-lg">En savoir plus</a>
        </div>
      </div>
    </section>`;
}

function renderFeatures() {
  const features = [
    { icon: '🚚', title: 'Livraison rapide', desc: 'Livraison gratuite dès 50€ d\'achat' },
    { icon: '🔒', title: 'Paiement sécurisé', desc: 'Stripe & PayPal acceptés' },
    { icon: '↩️', title: 'Retours 30 jours', desc: 'Satisfait ou remboursé' },
    { icon: '💬', title: 'Support 24/7', desc: 'Une équipe à votre écoute' },
  ];
  return `
    <section class="section">
      <div class="container">
        <div class="section-header">
          <h2>Pourquoi nous choisir ?</h2>
          <p>Des avantages pensés pour vous</p>
        </div>
        <div class="features-grid">
          ${features.map(f => `
            <div class="feature-card">
              <div class="feature-icon">${f.icon}</div>
              <h3>${f.title}</h3>
              <p style="color: var(--text-secondary)">${f.desc}</p>
            </div>`).join('')}
        </div>
      </div>
    </section>`;
}

function renderFeatured() {
  const products = productService.getFeatured(4);
  return `
    <section class="section" style="background: var(--bg-secondary);">
      <div class="container">
        <div class="section-header">
          <h2>⭐ Produits vedettes</h2>
          <p>Nos coups de cœur du moment</p>
        </div>
        <div class="products-grid">
          ${products.map(p => productService.createCard(p)).join('')}
        </div>
        <div style="text-align:center; margin-top: 2rem;">
          <a href="#/shop" class="btn btn-primary btn-lg">Voir tous les produits →</a>
        </div>
      </div>
    </section>`;
}

function renderNewsletter() {
  return `
    <section class="section">
      <div class="container" style="max-width: 600px; text-align:center;">
        <h2>📧 Restez informé</h2>
        <p style="color: var(--text-secondary); margin: 1rem 0 2rem;">
          Inscrivez-vous à notre newsletter pour recevoir nos offres exclusives
        </p>
        <form style="display:flex; gap:0.5rem; flex-wrap:wrap;" onsubmit="event.preventDefault(); showToast('Inscription réussie ! 📧', 'success'); this.reset();">
          <input type="email" placeholder="votre@email.com" required class="form-control" style="flex:1; min-width:200px;">
          <button type="submit" class="btn btn-primary">S'inscrire</button>
        </form>
      </div>
    </section>`;
}

function renderShop(activeCategory = 'all', searchQuery = '') {
  return `
    <section class="section">
      <div class="container">
        <div class="section-header">
          <h2>🛍️ Notre Boutique</h2>
          <p>${productService.products.length} produits disponibles</p>
        </div>
        <div class="search-bar">
          <input type="search" id="productSearch" placeholder="🔍 Rechercher un produit..."
                 value="${escapeHtml(searchQuery)}" oninput="filterProducts()">
          <select id="sortSelect" class="sort-select" onchange="filterProducts()">
            <option value="default">Trier par : Pertinence</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
            <option value="rating">Meilleures notes</option>
            <option value="name">Nom A-Z</option>
          </select>
        </div>
        <div class="shop-layout">
          <aside class="filters">
            <div class="filter-group">
              <h4>Catégories</h4>
              ${CONFIG.CATEGORIES.map(c => `
                <label>
                  <input type="radio" name="category" value="${c.id}"
                         ${activeCategory === c.id ? 'checked' : ''} onchange="filterProducts()">
                  ${c.icon} ${c.name}
                </label>`).join('')}
            </div>
            <div class="filter-group">
              <h4>Prix</h4>
              <label><input type="radio" name="price" value="all" checked onchange="filterProducts()"> Tous les prix</label>
              <label><input type="radio" name="price" value="0-50" onchange="filterProducts()"> Moins de 50€</label>
              <label><input type="radio" name="price" value="50-100" onchange="filterProducts()"> 50€ - 100€</label>
              <label><input type="radio" name="price" value="100-200" onchange="filterProducts()"> 100€ - 200€</label>
              <label><input type="radio" name="price" value="200+" onchange="filterProducts()"> Plus de 200€</label>
            </div>
            <div class="filter-group">
              <h4>Disponibilité</h4>
              <label><input type="checkbox" id="inStockOnly" onchange="filterProducts()"> En stock uniquement</label>
            </div>
          </aside>
          <div>
            <div class="products-grid" id="productsGrid">
              ${renderProductGrid(activeCategory, searchQuery)}
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

function renderProductGrid(category = 'all', query = '') {
  let products = productService.products;

  if (query) products = productService.search(query);
  if (category !== 'all') products = products.filter(p => p.category === category);

  if (products.length === 0) {
    return `<div style="grid-column: 1/-1; text-align:center; padding: 3rem; color: var(--text-muted);">
      <div style="font-size: 4rem; margin-bottom: 1rem;">🔍</div>
      <h3>Aucun produit trouvé</h3>
      <p>Essayez d'autres critères de recherche</p>
    </div>`;
  }

  return products.map(p => productService.createCard(p)).join('');
}

function filterProducts() {
  const category = document.querySelector('input[name="category"]:checked')?.value || 'all';
  const priceRange = document.querySelector('input[name="price"]:checked')?.value || 'all';
  const sort = document.getElementById('sortSelect')?.value || 'default';
  const search = document.getElementById('productSearch')?.value || '';
  const inStockOnly = document.getElementById('inStockOnly')?.checked;

  let products = productService.products;
  if (search) products = productService.search(search);
  if (category !== 'all') products = products.filter(p => p.category === category);
  if (inStockOnly) products = products.filter(p => p.stock > 0);

  if (priceRange !== 'all') {
    const [min, max] = priceRange.split('-').map(s => s === '+' ? Infinity : parseFloat(s));
    products = products.filter(p => p.price >= min && (isNaN(max) ? true : p.price <= max));
  }

  // Tri
  switch (sort) {
    case 'price-asc': products.sort((a, b) => a.price - b.price); break;
    case 'price-desc': products.sort((a, b) => b.price - a.price); break;
    case 'rating': products.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
    case 'name': products.sort((a, b) => a.title.localeCompare(b.title)); break;
  }

  const grid = document.getElementById('productsGrid');
  if (grid) grid.innerHTML = products.length ? products.map(p => productService.createCard(p)).join('') :
    '<div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted)">🔍 Aucun produit trouvé</div>';
}

function renderProductDetail(product) {
  const discount = product.originalPrice ?
    Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const related = productService.getRelated(product.id, 4);

  return `
    <section class="section">
      <div class="container">
        <nav style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
          <a href="#/">Accueil</a> / <a href="#/shop">Boutique</a> /
          <a href="#/shop?cat=${product.category}">${getCategoryName(product.category)}</a> /
          <span>${escapeHtml(product.title)}</span>
        </nav>
        <div class="product-detail">
          <div class="product-detail-image">
            ${product.image ? (product.image.startsWith('http') ?
              `<img src="${product.image}" alt="${escapeHtml(product.title)}">` :
              `<span>${product.image}</span>`) : `<span>${product.emoji || '📦'}</span>`}
          </div>
          <div class="product-detail-info">
            <div class="product-category">${getCategoryName(product.category)}</div>
            <h1>${escapeHtml(product.title)}</h1>
            <div class="product-rating">
              ${'★'.repeat(Math.floor(product.rating || 0))}${'☆'.repeat(5 - Math.floor(product.rating || 0))}
              <span style="color: var(--text-muted); margin-left: 0.5rem;">
                ${product.rating || 0}/5 (${product.reviews || 0} avis)
              </span>
            </div>
            <div class="price">
              ${formatPrice(product.price)}
              ${product.originalPrice ? `<span class="original" style="font-size: 1.5rem;">${formatPrice(product.originalPrice)}</span>` : ''}
              ${discount ? `<span style="background: var(--success); color: white; padding: 0.25rem 0.5rem; border-radius: var(--radius); font-size: 1rem; margin-left: 0.5rem;">-${discount}%</span>` : ''}
            </div>
            <p class="description">${escapeHtml(product.description || '')}</p>
            ${product.features ? `
              <ul class="product-features">
                ${product.features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
              </ul>` : ''}
            <div style="display:flex; align-items:center; gap:1rem; margin: 1.5rem 0;">
              <div class="quantity-controls">
                <button onclick="document.getElementById('detailQty').value = Math.max(1, parseInt(document.getElementById('detailQty').value) - 1)">−</button>
                <input id="detailQty" type="number" value="1" min="1" max="${product.stock}"
                       style="width:50px; text-align:center; border:none; background:transparent; color:inherit; font-weight:600;">
                <button onclick="document.getElementById('detailQty').value = Math.min(${product.stock}, parseInt(document.getElementById('detailQty').value) + 1)">+</button>
              </div>
              <span style="color: ${product.stock > 0 ? 'var(--success)' : 'var(--danger)'};">
                ${product.stock > 0 ? `✅ En stock (${product.stock})` : '❌ Rupture de stock'}
              </span>
            </div>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              <button class="btn btn-primary btn-lg" style="flex:1;"
                      onclick="addToCartWithQty('${product.id}')" ${product.stock <= 0 ? 'disabled' : ''}>
                🛒 Ajouter au panier
              </button>
              <button class="btn btn-secondary btn-lg" onclick="toggleWishlist('${product.id}')">
                ${window.Wishlist.has(product.id) ? '❤️' : '🤍'}
              </button>
            </div>
            <div style="margin-top: 2rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius);">
              <p style="font-size: 0.9rem; color: var(--text-secondary);">
                🚚 Livraison estimée : 2-4 jours ouvrés<br>
                📦 Retours gratuits sous 30 jours<br>
                🔒 Paiement 100% sécurisé
              </p>
            </div>
          </div>
        </div>
        ${related.length ? `
          <div style="margin-top: 4rem;">
            <h2 style="margin-bottom: 2rem;">🔗 Produits similaires</h2>
            <div class="products-grid">
              ${related.map(p => productService.createCard(p)).join('')}
            </div>
          </div>` : ''}
      </div>
    </section>`;
}

function addToCartWithQty(productId) {
  const product = productService.findById(productId);
  const qty = parseInt(document.getElementById('detailQty')?.value) || 1;
  if (product) {
    window.Cart.add(product, qty);
    showToast(`${qty} × ${product.title} ajouté au panier 🛒`, 'success');
  }
}

function renderCheckout() {
  return `
    <section class="section">
      <div class="container">
        <h1 style="margin-bottom: 2rem;">💳 Finalisation de la commande</h1>
        <form id="checkoutForm" class="checkout-form" onsubmit="submitOrder(event)">
          <div>
            <div class="checkout-section">
              <h3>📧 Informations de contact</h3>
              <div class="form-group">
                <label>Email *</label>
                <input type="email" name="email" required class="form-control" placeholder="vous@email.com">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Prénom *</label>
                  <input type="text" name="firstName" required class="form-control">
                </div>
                <div class="form-group">
                  <label>Nom *</label>
                  <input type="text" name="lastName" required class="form-control">
                </div>
              </div>
              <div class="form-group">
                <label>Téléphone</label>
                <input type="tel" name="phone" class="form-control" placeholder="+33 6 12 34 56 78">
              </div>
            </div>

            <div class="checkout-section">
              <h3>🚚 Adresse de livraison</h3>
              <div class="form-group">
                <label>Adresse *</label>
                <input type="text" name="address" required class="form-control" placeholder="N° et rue">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Code postal *</label>
                  <input type="text" name="zipCode" required class="form-control">
                </div>
                <div class="form-group">
                  <label>Ville *</label>
                  <input type="text" name="city" required class="form-control">
                </div>
              </div>
              <div class="form-group">
                <label>Pays *</label>
                <select name="country" required class="form-control">
                  <option value="FR">🇫🇷 France</option>
                  <option value="BE">🇧🇪 Belgique</option>
                  <option value="CH">🇨🇭 Suisse</option>
                  <option value="CA">🇨🇦 Canada</option>
                </select>
              </div>
            </div>

            <div class="checkout-section">
              <h3>💳 Paiement</h3>
              <div class="form-group">
                <label>Mode de paiement</label>
                <select name="payment" class="form-control" id="paymentMethod" onchange="togglePayment()">
                  <option value="stripe">💳 Carte bancaire (Stripe)</option>
                  <option value="paypal">🅿️ PayPal</option>
                  <option value="cod">💵 Paiement à la livraison</option>
                </select>
              </div>
              <div id="paymentDetails">
                <div class="form-group">
                  <label>Numéro de carte</label>
                  <input type="text" class="form-control" placeholder="4242 4242 4242 4242" maxlength="19">
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Expiration</label>
                    <input type="text" class="form-control" placeholder="MM/AA" maxlength="5">
                  </div>
                  <div class="form-group">
                    <label>CVC</label>
                    <input type="text" class="form-control" placeholder="123" maxlength="3">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="checkout-section" style="position: sticky; top: 100px;">
              <h3>📋 Récapitulatif</h3>
              <div id="checkoutItems"></div>
              <div class="cart-summary" style="margin-top: 1rem;">
                <div class="cart-summary-row"><span>Sous-total</span><strong>${formatPrice(window.Cart.subtotal)}</strong></div>
                <div class="cart-summary-row"><span>Livraison</span><strong>${window.Cart.shipping === 0 ? 'Gratuite' : formatPrice(window.Cart.shipping)}</strong></div>
                <div class="cart-summary-row"><span>TVA</span><strong>${formatPrice(window.Cart.tax)}</strong></div>
                <div class="cart-summary-row total"><span>Total</span><span>${formatPrice(window.Cart.total)}</span></div>
              </div>
              <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top: 1rem;">
                🔒 Confirmer et payer
              </button>
              <p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; margin-top: 1rem;">
                En passant commande, vous acceptez nos CGV et notre politique de confidentialité.
              </p>
            </div>
          </div>
        </form>
      </div>
    </section>`;
}

function renderOrderConfirmation(orderId) {
  return `
    <section class="section">
      <div class="container" style="max-width: 600px; text-align: center;">
        <div style="font-size: 5rem; margin-bottom: 1rem;">✅</div>
        <h1>Commande confirmée !</h1>
        <p style="font-size: 1.2rem; color: var(--text-secondary); margin: 1rem 0;">
          Merci pour votre commande
        </p>
        <div style="background: var(--bg-secondary); padding: 1.5rem; border-radius: var(--radius-lg); margin: 2rem 0;">
          <p><strong>Numéro de commande :</strong></p>
          <code style="font-size: 1.2rem; color: var(--primary);">${orderId}</code>
          <p style="margin-top: 1rem; color: var(--text-secondary);">
            Un email de confirmation vous a été envoyé.
          </p>
        </div>
        <a href="#/" class="btn btn-primary btn-lg">Retour à l'accueil</a>
      </div>
    </section>`;
}

function renderAbout() {
  return `
    <section class="section">
      <div class="container" style="max-width: 800px;">
        <h1>À propos de GitHub Shop</h1>
        <p style="margin: 1.5rem 0; font-size: 1.1rem; color: var(--text-secondary);">
          Nous sommes une boutique en ligne innovante propulsée par GitHub Pages,
          l'API GitHub et les GitHub Actions. Notre infrastructure serverless offre
          une expérience d'achat moderne, rapide et écologique.
        </p>
        <h2>🎯 Notre mission</h2>
        <p>Démontrer qu'il est possible de créer une boutique e-commerce complète
        sans serveur backend traditionnel, en utilisant uniquement l'écosystème GitHub.</p>
        <h2>🛠️ Technologies</h2>
        <ul style="list-style: disc; padding-left: 2rem; margin: 1rem 0;">
          <li>HTML5, CSS3, JavaScript (Vanilla)</li>
          <li>GitHub Pages (hébergement)</li>
          <li>GitHub API (base de données)</li>
          <li>GitHub Actions (automatisation)</li>
          <li>Stripe / PayPal (paiements)</li>
        </ul>
      </div>
    </section>`;
}

function renderContact() {
  return `
    <section class="section">
      <div class="container" style="max-width: 600px;">
        <h1>📧 Contactez-nous</h1>
        <p style="margin: 1rem 0; color: var(--text-secondary);">
          Une question ? Notre équipe vous répond sous 24h.
        </p>
        <form onsubmit="event.preventDefault(); showToast('Message envoyé ! 📧', 'success'); this.reset();">
          <div class="form-group">
            <label>Nom</label>
            <input type="text" required class="form-control">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" required class="form-control">
          </div>
          <div class="form-group">
            <label>Sujet</label>
            <input type="text" required class="form-control">
          </div>
          <div class="form-group">
            <label>Message</label>
            <textarea required class="form-control" rows="6"></textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-lg btn-block">Envoyer le message</button>
        </form>
      </div>
    </section>`;
}

function renderFAQ() {
  const faqs = [
    { q: 'Comment passer commande ?', a: 'Ajoutez des produits au panier, puis cliquez sur "Passer commande". Renseignez vos informations et validez.' },
    { q: 'Quels sont les délais de livraison ?', a: 'La livraison standard prend 2-4 jours ouvrés en France métropolitaine.' },
    { q: 'Puis-je retourner un article ?', a: 'Oui, vous disposez de 30 jours pour retourner un article dans son état d\'origine.' },
    { q: 'Comment suivre ma commande ?', a: 'Un email de confirmation avec un numéro de suivi vous est envoyé après expédition.' },
    { q: 'Les paiements sont-ils sécurisés ?', a: 'Oui, tous les paiements sont sécurisés par Stripe avec chiffrement SSL.' },
  ];
  return `
    <section class="section">
      <div class="container" style="max-width: 800px;">
        <h1>❓ Questions fréquentes</h1>
        <div style="margin-top: 2rem;">
          ${faqs.map(f => `
            <details style="background: var(--bg-secondary); padding: 1.5rem; border-radius: var(--radius); margin-bottom: 1rem;">
              <summary style="font-weight: 600; cursor: pointer;">${f.q}</summary>
              <p style="margin-top: 1rem; color: var(--text-secondary);">${f.a}</p>
            </details>`).join('')}
        </div>
      </div>
    </section>`;
}

function renderShipping() {
  return `<section class="section"><div class="container" style="max-width:800px;">
    <h1>🚚 Informations de livraison</h1>
    <p style="margin-top: 1rem;">Livraison standard : 2-4 jours ouvrés (5,99€).</p>
    <p>Livraison gratuite dès 50€ d'achat.</p>
    <p>Livraison express : 24h (12,99€).</p>
  </div></section>`;
}

function renderReturns() {
  return `<section class="section"><div class="container" style="max-width:800px;">
    <h1>↩️ Retours et remboursements</h1>
    <p style="margin-top: 1rem;">Vous disposez de 30 jours pour retourner votre commande.</p>
    <p>Les retours sont gratuits en France métropolitaine.</p>
  </div></section>`;
}

function render404() {
  return `<section class="section"><div class="container" style="text-align:center;">
    <div style="font-size: 5rem;">🤔</div>
    <h1>Page non trouvée</h1>
    <p style="margin: 1rem 0;">La page que vous cherchez n'existe pas.</p>
    <a href="#/" class="btn btn-primary">Retour à l'accueil</a>
  </div></section>`;
}

function renderError(err) {
  return `<section class="section"><div class="container" style="text-align:center;">
    <h1>😱 Une erreur est survenue</h1>
    <p>${escapeHtml(err.message)}</p>
    <a href="#/" class="btn btn-primary" style="margin-top: 1rem;">Retour à l'accueil</a>
  </div></section>`;
}

// =====================
// Admin (placeholder)
// =====================
function renderAdmin() {
  return `
    <section class="section">
      <div class="container">
        <h1>⚙️ Administration</h1>
        <p>Panel d'administration - <a href="admin.html" style="color: var(--primary);">Ouvrir le panel →</a></p>
      </div>
    </section>`;
}

// =====================
// Initialisation
// =====================
const githubAPI = new GitHubAPI(CONFIG);

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  // Theme
  const theme = localStorage.getItem('gh-shop-theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('gh-shop-theme', next);
    document.getElementById('themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
  });

  // Restore token
  const token = localStorage.getItem('gh-shop-token');
  if (token) githubAPI.setToken(token);
});

// Export
window.router = router;
window.githubAPI = githubAPI;
