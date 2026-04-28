// Shop Logic for Tech Turf

const resolveApiBaseUrl = () => {
    const explicitBase = window.__TECHTURF_API_BASE__ || localStorage.getItem('tt_api_base');
    if (explicitBase) return explicitBase;

    const currentBase = window.API_BASE_URL;
    if (currentBase && !/^\/api\/?$/.test(currentBase)) return currentBase;

    return 'http://localhost:5000/api';
};

window.API_BASE_URL = resolveApiBaseUrl();

function normalizeProductImageUrl(url) {
    if (!url) return '';
    const value = String(url).trim().replace(/\\/g, '/');
    if (!value) return '';
    if (/^data:image\//i.test(value) || /^https?:\/\//i.test(value) || value.startsWith('//')) return value;
    const apiOrigin = new URL(window.API_BASE_URL).origin;
    return value.startsWith('/') ? `${apiOrigin}${value}` : `${apiOrigin}/${value}`;
}

window.normalizeProductImageUrl = normalizeProductImageUrl;

// --- State Management ---
// Keep cart key aligned with layout.js (tt_cart). Migrate legacy key if needed.
if (!localStorage.getItem('tt_cart') && localStorage.getItem('techTurfCart')) {
    localStorage.setItem('tt_cart', localStorage.getItem('techTurfCart'));
    localStorage.removeItem('techTurfCart');
}

const state = {
    products: [],
    cart: JSON.parse(localStorage.getItem('tt_cart')) || []
};

// --- API Interactions ---

async function fetchProducts(search = '', category = 'all') {
    try {
        let url = `${window.API_BASE_URL}/products`;
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (category && category !== 'all') params.append('category', category);
        
        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch products');
        const products = await response.json();
        const normalizedProducts = Array.isArray(products)
            ? products.map((product) => ({
                ...product,
                imageUrl: normalizeProductImageUrl(product.imageUrl || product.image_url || product.image),
                image_url: normalizeProductImageUrl(product.image_url || product.imageUrl || product.image)
            }))
            : [];
        state.products = normalizedProducts;
        return normalizedProducts;
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

async function createOrder(orderData, token) {
    try {
        const response = await fetch(`${window.API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Order failed');
        }

        return await response.json();
    } catch (error) {
        console.error('Order creation error:', error);
        throw error;
    }
}

// --- Cart Operations ---

function addToCart(product) {
    const productId = product._id || product.id;
    const existingItem = state.cart.find(item => (item._id || item.id) === productId);
    if (existingItem) {
        existingItem.qty = (existingItem.qty || existingItem.quantity || 0) + 1;
        existingItem.quantity = existingItem.qty;
    } else {
        state.cart.push({
            ...product,
            _id: productId,
            id: productId,
            qty: 1,
            quantity: 1,
            image: product.image || product.imageUrl || (product.images && product.images[0])
        });
    }
    saveCart();
    if (window.showMessage) window.showMessage('success', `${product.name} added to cart!`);
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => (item._id || item.id) !== productId);
    saveCart();
}

function updateCartQuantity(productId, quantity) {
    const item = state.cart.find(item => (item._id || item.id) === productId);
    if (item) {
        const qty = parseInt(quantity, 10);
        item.qty = qty;
        item.quantity = qty;
        if (qty <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
        }
    }
}

function clearCart() {
    state.cart = [];
    saveCart();
}

async function pushCartToServer() {
    if (!isLoggedIn()) return;
    try {
        const token = getAuthToken();
        await fetch(`${window.API_BASE_URL}/users/cart`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ cart: state.cart })
        });
    } catch (error) {
        console.error('Failed to sync cart:', error);
    }
}

async function pullCartFromServer() {
    if (!isLoggedIn()) return;
    try {
        const token = getAuthToken();
        const response = await fetch(`${window.API_BASE_URL}/users/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (payload && Array.isArray(payload.cart) && payload.cart.length > 0) {
            state.cart = payload.cart;
            localStorage.setItem('tt_cart', JSON.stringify(state.cart));
            if (window.updateCartDisplay) window.updateCartDisplay();
            window.dispatchEvent(new Event('cartUpdated'));
        } else if (state.cart.length > 0) {
            await pushCartToServer();
        }
    } catch (error) {
        console.error('Failed to load cart from server:', error);
    }
}

function saveCart() {
    localStorage.setItem('tt_cart', JSON.stringify(state.cart));
    if (window.updateCartDisplay) window.updateCartDisplay();
    window.dispatchEvent(new Event('cartUpdated'));
    pushCartToServer();
}

function getCartTotal() {
    return state.cart.reduce((acc, item) => acc + item.price * (item.qty || item.quantity || 1), 0);
}

// --- Auth Helpers ---

function isLoggedIn() {
    return !!localStorage.getItem('tt_token');
}

function getAuthToken() {
    return localStorage.getItem('tt_token');
}

// --- UI Helpers ---

function formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(price);
}

// --- Initialization ---

// Expose functions globally for inline handlers if needed
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.getCart = () => state.cart;
window.fetchProducts = fetchProducts;
window.createOrder = createOrder;
window.formatPrice = formatPrice;
window.clearCart = clearCart;
window.saveCart = (newCart) => { state.cart = newCart; saveCart(); }; // Support for setting cart directly
window.getCartTotal = getCartTotal;
window.isLoggedIn = isLoggedIn;
window.getAuthToken = getAuthToken;

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    // Polyfill for simple showMessage if not defined
    if (!window.showMessage) {
        window.showMessage = (type, msg) => {
            alert(`${type.toUpperCase()}: ${msg}`);
        };
    }
    if (window.updateCartDisplay) window.updateCartDisplay();
    pullCartFromServer();
});
