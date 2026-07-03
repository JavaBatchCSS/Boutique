/**
 * Gestion du checkout et soumission de commande
 */
async function submitOrder(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;

  // Désactiver le bouton
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loading" style="width:20px; height:20px; border-width:2px;"></span> Traitement...';

  try {
    const formData = new FormData(form);
    const order = {
      customer: {
        email: formData.get('email'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        zipCode: formData.get('zipCode'),
        city: formData.get('city'),
        country: formData.get('country'),
      },
      items: window.Cart.items,
      payment: {
        method: formData.get('payment'),
        status: formData.get('payment') === 'cod' ? 'pending' : 'paid',
      },
      pricing: {
        subtotal: window.Cart.subtotal,
        shipping: window.Cart.shipping,
        tax: window.Cart.tax,
        total: window.Cart.total,
      },
    };

    // Validation
    if (!order.customer.email || !order.customer.address) {
      throw new Error('Veuillez remplir tous les champs obligatoires');
    }

    if (window.Cart.items.length === 0) {
      throw new Error('Votre panier est vide');
    }

    // Simulation du paiement (en prod : appel Stripe)
    await new Promise(r => setTimeout(r, 1500));

    // Création de la commande via GitHub API
    let created;
    if (githubAPI.hasToken()) {
      try {
        created = await githubAPI.createOrder(order);
      } catch (err) {
        console.warn('Failed to save to GitHub, using local:', err);
        created = { id: `ORD-${Date.now()}`, ...order };
      }
    } else {
      // Pas de token : on utilise un ID local
      created = { id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`, ...order };
      // Sauvegarde locale de secours
      const orders = JSON.parse(localStorage.getItem('gh-shop-orders') || '[]');
      orders.unshift(created);
      localStorage.setItem('gh-shop-orders', JSON.stringify(orders));
    }

    // Stocker pour la page de confirmation
    sessionStorage.setItem('lastOrder', JSON.stringify(created));

    // Vider le panier
    window.Cart.clear();

    // Déclencher webhook / GitHub Action
    if (githubAPI.hasToken()) {
      githubAPI.triggerWorkflow('new-order', { orderId: created.id }).catch(() => {});
    }

    // Rediriger
    showToast('🎉 Commande validée !', 'success', 2000);
    setTimeout(() => {
      window.location.hash = `#/order/${created.id}`;
    }, 1000);

  } catch (err) {
    showToast(err.message || 'Erreur lors de la commande', 'error', 5000);
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

function togglePayment() {
  const method = document.getElementById('paymentMethod')?.value;
  const details = document.getElementById('paymentDetails');
  if (details) {
    details.style.display = method === 'cod' ? 'none' : 'block';
  }
}

// Mettre à jour le récap checkout
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const checkoutItems = document.getElementById('checkoutItems');
    if (checkoutItems) {
      checkoutItems.innerHTML = window.Cart.items.map(item => `
        <div style="display:flex; gap:0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border);">
          <div style="width:50px; height:50px; background: var(--bg); border-radius: var(--radius); display:flex; align-items:center; justify-content:center; font-size:1.5rem;">
            ${item.emoji || (item.image?.startsWith('http') ? `<img src="${item.image}" style="width:100%; height:100%; object-fit:cover; border-radius: var(--radius);">` : '📦')}
          </div>
          <div style="flex:1;">
            <div style="font-weight: 600; font-size: 0.9rem;">${escapeHtml(item.title)}</div>
            <div style="color: var(--text-muted); font-size: 0.85rem;">Qté: ${item.qty}</div>
          </div>
          <div style="font-weight: 600;">${formatPrice(item.price * item.qty)}</div>
        </div>
      `).join('');
    }
  }, 100);
});
