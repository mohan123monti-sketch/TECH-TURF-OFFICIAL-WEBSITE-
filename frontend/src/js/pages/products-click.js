// Product click handler for products.html
// This script enables clicking a product card to open product-details.html with the correct product id

import { getAllProducts } from '../features/products.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Find the container where product cards are rendered
  const productGrid = document.querySelector('.grid');
  if (!productGrid) return;

  // Attach click event to all product cards (assuming each card has data-product-id)
  productGrid.addEventListener('click', (e) => {
    let card = e.target;
    // Traverse up to the card element
    while (card && !card.dataset.productId && card !== productGrid) {
      card = card.parentElement;
    }
    if (card && card.dataset.productId) {
      const productId = card.dataset.productId;
      window.location.href = `/pages/product-details.html?id=${productId}`;
    }
  });
});
