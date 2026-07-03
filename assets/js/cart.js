/**
 * Gestionnaire du panier (localStorage)
 */
class Cart {
  constructor() {
    this.key = 'gh-shop-cart';
    this.items = this.load();
    this.listeners = [];
  }

  load() {
    try {
      return JSON.parse(localStorage.getItem(this.key)) || [];
    } catch { return []; }
  }

  save() {
    localStorage.setItem(this.key, JSON.stringify(this.items));
    this.notify();
  }

  subscribe(fn) {
    this.listeners.push(fn);
    fn(this.items);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.items));
    this.updateBadge();
  }

  updateBadge() {
    const count = this.items.reduce((sum, i) => sum + i.qty, 0);
    const badge = document.getElementById('cartCount');
    if (badge) {
      badge.textContent = count;
      badge.setAttribute('data-count', count);
    }
  }

  add(product, qty = 1) {
    const existing = this.items.find(i => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      this.items.push({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.image || product.emoji,
        emoji: product.emoji,
        qty,
        stock: product.stock || 999,
      });
    }
    this.save();
    return this.items;
  }

  remove(productId) {
    this.items = this.items.filter(i => i.id !== productId);
    this.save();
  }

  update(productId, qty) {
    const item = this.items.find(i => i.id === productId);
    if (item) {
      if (qty <= 0) {
        this.remove(productId);
      } else {
        item.qty = Math.min(qty, item.stock);
        this.save();
      }
    }
  }

  clear() {
    this.items = [];
    this.save();
  }

  get count() {
    return this.items.reduce((sum, i) => sum + i.qty, 0);
  }

  get subtotal() {
    return this.items.reduce((sum, i) => sum + (i.price * i.qty), 0);
  }

  get shipping() {
    return this.subtotal >= CONFIG.SHOP.freeShippingThreshold ? 0 : CONFIG.SHOP.shippingCost;
  }

  get tax() {
    return this.subtotal * CONFIG.SHOP.taxRate;
  }

  get total() {
    return this.subtotal + this.shipping + this.tax;
  }
}

class Wishlist {
  constructor() {
    this.key = 'gh-shop-wishlist';
    this.items = this.load();
  }

  load() {
    try { return JSON.parse(localStorage.getItem(this.key)) || []; }
    catch { return []; }
  }

  save() {
    localStorage.setItem(this.key, JSON.stringify(this.items));
    const badge = document.getElementById('wishlistCount');
    if (badge) {
      badge.textContent = this.items.length;
      badge.setAttribute('data-count', this.items.length);
    }
  }

  toggle(productId) {
    const idx = this.items.indexOf(productId);
    if (idx >= 0) {
      this.items.splice(idx, 1);
    } else {
      this.items.push(productId);
    }
    this.save();
    return idx < 0;
  }

  has(productId) { return this.items.includes(productId); }

  clear() { this.items = []; this.save(); }
}

window.Cart = new Cart();
window.Wishlist = new Wishlist();

// Rendu du panier
function renderCart() {
  const container = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  if (!container || !footer) return;

  if (window.Cart.items.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:3rem 1rem; color: var(--text-muted);">
        <div style="font-size:4rem; margin-bottom:1rem;">🛒</div>
        <p>Votre panier est vide</p>
        <a href="#/shop" class="btn btn-primary" style="margin-top:1rem;" onclick="closeCart()">Découvrir nos produits</a>
      </div>`;
    footer.innerHTML = '';
    return;
  }

  container.innerHTML = window.Cart.items.map(item => `
    <div class="cart-item">
      <div class="cart-item-image">
        ${item.image ? (item.image.startsWith('http') ? `<img src="${item.image}" alt="">` : item.image) : (item.emoji || '📦')}
      </div>
      <div class="cart-item-info">
        <h4>${escapeHtml(item.title)}</h4>
        <div class="price">${formatPrice(item.price)}</div>
        <div class="quantity-controls">
          <button onclick="window.Cart.update('${item.id}', ${item.qty - 1})">−</button>
          <span>${item.qty}</span>
          <button onclick="window.Cart.update('${item.id}', ${item.qty + 1})">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="window.Cart.remove('${item.id}')" aria-label="Supprimer">🗑️</button>
    </div>
  `).join('');

  footer.innerHTML = `
    <div class="cart-summary">
      <div class="cart-summary-row"><span>Sous-total</span><strong>${formatPrice(window.Cart.subtotal)}</strong></div>
      <div class="cart-summary-row"><span>TVA (${(CONFIG.SHOP.taxRate*100)}%)</span><strong>${formatPrice(window.Cart.tax)}</strong></div>
      <div class="cart-summary-row"><span>Livraison</span><strong>${window.Cart.shipping === 0 ? 'Gratuite 🎉' : formatPrice(window.Cart.shipping)}</strong></div>
      <div class="cart-summary-row total"><span>Total</span><span>${formatPrice(window.Cart.total)}</span></div>
    </div>
    <a href="#/checkout" class="btn btn-primary btn-block btn-lg" onclick="closeCart()">Passer commande →</a>
    <button class="btn btn-secondary btn-block" style="margin-top:0.5rem;" onclick="window.Cart.clear()">Vider le panier</button>
  `;
}

function openCart() {
  document.getElementById('cartSidebar').classList.add('open');
  document.getElementById('overlay').classList.add('open');
  renderCart();
}

function closeCart() {
  document.getElementById('cartSidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

// Helpers globaux
function formatPrice(amount) {
  return `${amount.toFixed(2)} ${CONFIG.SHOP.currencySymbol}`;
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Events
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cartBtn')?.addEventListener('click', openCart);
  document.getElementById('closeCart')?.addEventListener('click', closeCart);
  document.getElementById('overlay')?.addEventListener('click', closeCart);

  window.Cart.subscribe(() => renderCart());
  window.Cart.updateBadge();
  window.Wishlist.save();
});
