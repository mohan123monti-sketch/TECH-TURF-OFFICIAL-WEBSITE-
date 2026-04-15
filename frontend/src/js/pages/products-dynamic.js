// Render a grid of real products with unique IDs on products.html
import { getAllProducts } from '../features/products.js';

document.addEventListener('DOMContentLoaded', async () => {
  const productGrid = document.querySelector('.grid');
  if (!productGrid) return;

  // Fetch products from backend
  let products = [];
  try {
    products = await getAllProducts();
  } catch (e) {
    productGrid.innerHTML = '<div class="col-span-full text-red-500">Failed to load products.</div>';
    return;
  }

  // Render product cards
  productGrid.innerHTML = products.map(product => `
    <div class="product-card group bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl cursor-pointer transition hover:scale-105" data-product-id="${product.id}">
      <img src="${product.image_url || '/public/images/space-bg.png'}" alt="${product.name}" class="w-full h-48 object-cover rounded-xl mb-6">
      <h3 class="text-xl font-black mb-2 text-white uppercase tracking-tighter">${product.name}</h3>
      <p class="text-gray-400 text-sm mb-4">${product.category || ''}</p>
      <span class="text-2xl font-bold text-white">₹${product.price}</span>
    </div>
  `).join('');

  // Attach click event to product cards
  productGrid.addEventListener('click', (e) => {
    let card = e.target;
    while (card && !card.dataset.productId && card !== productGrid) {
      card = card.parentElement;
    }
    if (card && card.dataset.productId) {
      const productId = card.dataset.productId;
      window.location.href = `/pages/product-details.html?id=${productId}`;
    }
  });
});
