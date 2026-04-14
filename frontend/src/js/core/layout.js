/* ========================================================================
   Tech Turf Layout Logic
   Phase 7: Final Integration (Firebase + Dynamic UI + Cursor)
   - Procedural 3D Scrollytelling
   - Magnetic UI
   - Global Toasts & Cart
   - Dynamic Auth State Updating
   - Custom Cursor Logic
   ======================================================================== */

const apiOverride = localStorage.getItem('tt_api_base');
window.API_BASE_URL = (window.API_BASE_URL && !/^\/api\/?$/.test(window.API_BASE_URL))
    ? window.API_BASE_URL
    : apiOverride || window.__TECHTURF_API_BASE__ || 'http://localhost:5000/api';

// --- Real-time Order Updates (Socket.io) ---
function initOrderSocket() {
    if (!window.io) return;

    const socketBaseUrl = window.API_BASE_URL.replace(/\/api$/, '');
    const socket = window.io(socketBaseUrl, {
        transports: ['websocket', 'polling']
    });

    socket.on('order_updated', (payload) => {
        window.dispatchEvent(new CustomEvent('orderUpdated', { detail: payload }));
    });
}

function ensureSocketIo() {
    if (window.io) {
        initOrderSocket();
        return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
    script.onload = initOrderSocket;
    document.head.appendChild(script);
}

ensureSocketIo();

// --- 1. Global Message Handler (Toast) ---
function showMessage(type, message) {
    let container = document.getElementById('message-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'message-container';
        container.className = 'fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none w-full max-w-sm';
        document.body.appendChild(container);
    }

    const id = 'msg-' + Date.now();
    let icon = '';
    let color = '';

    switch (type) {
        case 'success':
            icon = 'check-circle';
            color = 'bg-green-600';
            break;
        case 'error':
            icon = 'x-octagon';
            color = 'bg-red-600';
            break;
        case 'info':
            icon = 'info';
            color = 'bg-blue-600';
            break;
        default:
            icon = 'message-square';
            color = 'bg-gray-600';
    }

    const msgHTML = `
           <div id="${id}" class="flex items-center p-4 rounded-xl shadow-lg ${color} text-white transition-all duration-300 transform translate-x-full opacity-0 pointer-events-auto">
               <i data-lucide="${icon}" class="w-5 h-5 mr-3 flex-shrink-0"></i>
               <span>${message}</span>
               <button onclick="document.getElementById('${id}').remove()" class="ml-auto text-white/70 hover:text-white">
                    <i data-lucide="x" class="w-4 h-4"></i>
               </button>
           </div>
       `;

    container.insertAdjacentHTML('beforeend', msgHTML);
    const msgElement = document.getElementById(id);

    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        msgElement.classList.remove('translate-x-full', 'opacity-0');
        msgElement.classList.add('translate-x-0', 'opacity-100');
    }, 50);

    setTimeout(() => {
        if (msgElement) {
            msgElement.classList.add('translate-x-full', 'opacity-0');
            msgElement.classList.remove('translate-x-0', 'opacity-100');
            setTimeout(() => msgElement.remove(), 300);
        }
    }, 5000);
}
window.showMessage = showMessage;

// --- 2. Cart Logic (Shopping) ---
function readStoredCart() {
    try {
        const cartJson = localStorage.getItem('tt_cart');
        return cartJson ? JSON.parse(cartJson) : [];
    } catch (error) {
        console.error('Error reading cart:', error);
        return [];
    }
}

function persistCart(cart) {
    localStorage.setItem('tt_cart', JSON.stringify(cart));
}

let cartState = readStoredCart();

function getCart() {
    return Array.isArray(cartState) ? cartState : [];
}
window.getCart = getCart;

function saveCart(cart) {
    cartState = Array.isArray(cart) ? cart : [];
    persistCart(cartState);
    window.updateCartDisplay();
    window.dispatchEvent(new Event('cartUpdated'));
    if (isLoggedIn()) {
        syncCartToServer();
    }
}
window.saveCart = saveCart;

async function syncCartToServer() {
    if (!isLoggedIn()) return;

    try {
        const token = getAuthToken();
        await fetch(`${window.API_BASE_URL}/users/cart`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ cart: cartState })
        });
    } catch (error) {
        console.error('Failed to sync cart:', error);
    }
}

async function hydrateCartFromServer() {
    if (!isLoggedIn()) return;

    try {
        const token = getAuthToken();
        const response = await fetch(`${window.API_BASE_URL}/users/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const payload = await response.json();
        const serverCart = Array.isArray(payload?.cart) ? payload.cart : [];
        const localCart = Array.isArray(cartState) ? cartState : [];

        if (serverCart.length > 0) {
            cartState = serverCart;
            persistCart(cartState);
            window.updateCartDisplay();
            window.dispatchEvent(new Event('cartUpdated'));
            return;
        }

        if (localCart.length > 0) {
            await syncCartToServer();
            return;
        }

        cartState = [];
        persistCart(cartState);
        window.updateCartDisplay();
        window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
        console.error('Failed to load cart from server:', error);
    }
}

function updateCartDisplay() {
    const cart = getCart();
    const cartCountElements = document.querySelectorAll('.cart-count');
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    cartCountElements.forEach(el => {
        el.textContent = totalItems > 9 ? '9+' : totalItems.toString();
        el.classList.toggle('hidden', totalItems === 0);
    });
}
window.updateCartDisplay = updateCartDisplay;

function updateWishlistDisplay() {
    const wishlist = getWishlistIds();
    const wishlistCountElements = document.querySelectorAll('.wishlist-count');
    const totalItems = wishlist.length;
    wishlistCountElements.forEach(el => {
        el.textContent = totalItems > 9 ? '9+' : totalItems.toString();
        el.classList.toggle('hidden', totalItems === 0);
    });
}
window.updateWishlistDisplay = updateWishlistDisplay;

function readStoredWishlist() {
    try {
        const wishlistJson = localStorage.getItem('tt_wishlist');
        return wishlistJson ? JSON.parse(wishlistJson) : [];
    } catch (error) {
        console.error('Error reading wishlist:', error);
        return [];
    }
}

function persistWishlist(items) {
    localStorage.setItem('tt_wishlist', JSON.stringify(items));
}

let wishlistState = readStoredWishlist();

function getWishlistIds() {
    return Array.isArray(wishlistState) ? wishlistState : [];
}
window.getWishlistIds = getWishlistIds;

function saveWishlistIds(items) {
    wishlistState = Array.isArray(items) ? items.map(String) : [];
    persistWishlist(wishlistState);
    updateWishlistDisplay();
    window.dispatchEvent(new Event('wishlistUpdated'));
    if (isLoggedIn()) {
        syncWishlistToServer();
    }
}
window.saveWishlistIds = saveWishlistIds;

function readStoredCompareIds() {
    try {
        const compareJson = localStorage.getItem('tt_compare');
        return compareJson ? JSON.parse(compareJson) : [];
    } catch (error) {
        console.error('Error reading compare list:', error);
        return [];
    }
}

function persistCompareIds(items) {
    localStorage.setItem('tt_compare', JSON.stringify(items));
}

let compareState = readStoredCompareIds();

function getCompareIds() {
    return Array.isArray(compareState) ? compareState : [];
}
window.getCompareIds = getCompareIds;

function saveCompareIds(items) {
    compareState = Array.isArray(items) ? items.map(String) : [];
    persistCompareIds(compareState);
    if (isLoggedIn()) {
        syncCompareToServer();
    }
    window.dispatchEvent(new Event('compareUpdated'));
}
window.saveCompareIds = saveCompareIds;

async function syncCompareToServer() {
    if (!isLoggedIn()) return;

    try {
        const token = getAuthToken();
        await fetch(`${window.API_BASE_URL}/users/compare`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ items: compareState })
        });
    } catch (error) {
        console.error('Failed to sync compare list:', error);
    }
}

async function hydrateCompareFromServer() {
    if (!isLoggedIn()) return;

    try {
        const token = getAuthToken();
        const response = await fetch(`${window.API_BASE_URL}/users/compare`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const payload = await response.json();
        const serverItems = Array.isArray(payload?.items) ? payload.items.map(String) : [];
        const localItems = Array.isArray(compareState) ? compareState.map(String) : [];

        if (serverItems.length > 0) {
            compareState = serverItems;
            persistCompareIds(compareState);
            window.dispatchEvent(new Event('compareUpdated'));
            return;
        }

        if (localItems.length > 0) {
            await syncCompareToServer();
            return;
        }

        compareState = [];
        persistCompareIds(compareState);
        window.dispatchEvent(new Event('compareUpdated'));
    } catch (error) {
        console.error('Failed to load compare list from server:', error);
    }
}

async function syncWishlistToServer() {
    if (!isLoggedIn()) return;

    try {
        const token = getAuthToken();
        await fetch(`${window.API_BASE_URL}/users/wishlist`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ items: wishlistState })
        });
    } catch (error) {
        console.error('Failed to sync wishlist:', error);
    }
}

async function hydrateWishlistFromServer() {
    if (!isLoggedIn()) return;

    try {
        const token = getAuthToken();
        const response = await fetch(`${window.API_BASE_URL}/users/wishlist`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const payload = await response.json();
        const serverItems = Array.isArray(payload?.items) ? payload.items.map(String) : [];
        const localItems = Array.isArray(wishlistState) ? wishlistState.map(String) : [];

        if (serverItems.length > 0) {
            wishlistState = serverItems;
            persistWishlist(wishlistState);
            updateWishlistDisplay();
            window.dispatchEvent(new Event('wishlistUpdated'));
            return;
        }

        if (localItems.length > 0) {
            await syncWishlistToServer();
            return;
        }

        wishlistState = [];
        persistWishlist(wishlistState);
        updateWishlistDisplay();
        window.dispatchEvent(new Event('wishlistUpdated'));
    } catch (error) {
        console.error('Failed to load wishlist from server:', error);
    }
}

function addToCart(product) {
    const cart = getCart();
    // Check if item already exists
    const existingItem = cart.find(item =>
        (product.id && item.id === product.id) || item.name === product.name
    );
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart(cart);
    if (window.showMessage) window.showMessage('success', `${product.name} added to cart!`);
}
window.addToCart = addToCart;

// --- 3. Auth State Management ---

function getAuthToken() { return localStorage.getItem('tt_token'); }
window.getAuthToken = getAuthToken;
function isLoggedIn() { return !!getAuthToken(); }
window.isLoggedIn = isLoggedIn;

window.addEventListener('orderUpdated', (event) => {
    if (!isLoggedIn() || !window.showMessage) return;
    const status = event && event.detail ? event.detail.status : null;
    window.showMessage('info', status ? `Order status updated: ${status}` : 'Order status updated.');
});

function isAuthRoute() {
    const file = (window.location.pathname.split('/').pop() || '').toLowerCase();
    return [
        'login.html',
        'signin.html',
        'register.html',
        'forgot-password.html',
        'reset-password.html'
    ].includes(file);
}

function handleLogout() {
    if (typeof window.firebaseAuthLogout === 'function') {
        window.firebaseAuthLogout();
    } else {
        localStorage.removeItem('tt_token');
        window.showMessage('info', 'Logged out successfully.');
        setTimeout(() => window.location.href = '/index.html', 1000);
    }
    localStorage.removeItem('tt_cart');
    localStorage.removeItem('tt_wishlist');
    localStorage.removeItem('tt_compare');
    cartState = [];
    wishlistState = [];
    compareState = [];
    window.updateCartDisplay();
    window.updateWishlistDisplay();
    window.dispatchEvent(new Event('compareUpdated'));
}
window.handleLogout = handleLogout;

// --- 4. Header & Footer Generation ---

function generateHeader() {
    const currentPageFile = window.location.pathname.split('/').pop();

    const divisions = [
        { name: 'Tech Turf', href: '/index.html' },
        { name: 'Quinta', href: '/pages/quinta.html' },
        { name: 'Trend Hive', href: '/pages/trend-hive.html' },
        { name: 'Click Sphere', href: '/pages/click-sphere.html' },
        { name: 'Shop', href: '/pages/shopping.html' }
    ];

    const loggedIn = isLoggedIn();
    renderNavHTML(loggedIn, divisions, currentPageFile);
}

function renderNavHTML(isUserLoggedIn, divisions, currentPageFile) {
    const authLinks = isUserLoggedIn ?
        `<a href="/admin/master-admin.html" class="transition-link text-white/70 hover:text-orange-400 px-3 py-2 rounded-lg transition-colors font-medium text-sm border border-transparent hover:border-orange-400/30">
               <i data-lucide="lock" class="w-5 h-5 inline-block mr-1 align-sub"></i> Admin
           </a>
           <a href="/pages/account.html" class="transition-link text-white/70 hover:text-white px-3 py-2 rounded-lg transition-colors font-medium text-sm border border-transparent hover:border-white/10">
               <i data-lucide="user" class="w-5 h-5 inline-block mr-1 align-sub"></i> Account
           </a>
           <button onclick="window.handleLogout()" class="magnetic-btn transition-link px-4 py-2 bg-red-600/70 text-white font-semibold rounded-lg hover:bg-red-500 transition-all text-sm">
               Sign Out
           </button>` :
        `<a href="/pages/login.html" class="transition-link text-white/70 hover:text-white px-3 py-2 rounded-lg transition-colors font-medium text-sm">Sign In</a>
           <a href="/pages/register.html" class="magnetic-btn transition-link px-4 py-2 bg-orange-600/70 text-white font-semibold rounded-lg hover:bg-orange-500 transition-all text-sm">
               Register
           </a>`;

    let logoSrc = '/assets/logos/tech-turf.png';
    let brandName = 'Tech Turf';

    const getActiveTabStyle = (pageFile) => {
        if (pageFile === 'quinta.html') {
            return 'background: rgba(14, 116, 144, 0.28); border: 1px solid rgba(34, 211, 238, 0.42); color: #d9fbff;';
        }
        if (pageFile === 'trend-hive.html') {
            return 'background: rgba(242, 101, 34, 0.28); border: 1px solid rgba(251, 146, 60, 0.45); color: #fff2e8;';
        }
        if (pageFile === 'click-sphere.html') {
            return 'background: rgba(34, 197, 94, 0.24); border: 1px solid rgba(74, 222, 128, 0.45); color: #eafff0;';
        }
        if (pageFile === 'shopping.html') {
            return 'background: rgba(242, 101, 34, 0.22); border: 1px solid rgba(251, 146, 60, 0.4); color: #fff2e8;';
        }
        // Tech Turf / default
        return 'background: rgba(37, 99, 235, 0.28); border: 1px solid rgba(96, 165, 250, 0.45); color: #e8f1ff;';
    };

    if (currentPageFile === 'click-sphere.html') {
        logoSrc = '/assets/logos/click-sphere.png';
        brandName = 'Click Sphere';
    } else if (currentPageFile === 'quinta.html') {
        logoSrc = '/assets/logos/quinta.png';
        brandName = 'Quinta';
    } else if (currentPageFile === 'trend-hive.html') {
        logoSrc = '/assets/logos/trend-hive.png';
        brandName = 'Trend Hive';
    }

    const navHTML = `
       <nav class="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-50 transition-all duration-500 liquid-glass" id="site-header">
           <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <div class="flex justify-between items-center h-16">
                   <a href="/index.html" class="flex-shrink-0 flex items-center transition-link group">
                       <img src="${logoSrc}" alt="${brandName} Logo" class="logo-nav">
                   </a>
   
                   <div class="hidden md:flex md:items-center space-x-1">
                       ${divisions.map(d => `
                           ${(() => { const isActive = d.href.split('/').pop() === currentPageFile; const activeStyle = isActive ? getActiveTabStyle(d.href.split('/').pop()) : ''; return `
                           <a href="${d.href}" class="transition-link text-white/70 hover:text-white px-3 py-2 rounded-lg transition-colors font-medium text-sm
                           ${isActive ? 'text-white' : ''}" style="${activeStyle}">
                               ${d.name}
                           </a>
                           `; })()}
                       `).join('')}
                   </div>
                   

                   <div class="hidden md:flex md:items-center space-x-3" id="desktop-auth-container">
                        ${authLinks}
                   </div>
   
                   <div class="md:hidden flex items-center gap-4">

                       <button id="mobile-menu-btn" class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                           <i data-lucide="menu" class="w-6 h-6"></i>
                       </button>
                   </div>
               </div>
           </div>
           
           <div class="md:hidden absolute w-full bg-[#05080f]/95 border-b border-white/5 shadow-2xl" id="mobile-menu" style="display: none;">
               <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                   ${divisions.map(d => `
                       ${(() => { const isActive = d.href.split('/').pop() === currentPageFile; const activeStyle = isActive ? getActiveTabStyle(d.href.split('/').pop()) : ''; return `
                       <a href="${d.href}" class="transition-link block text-white/70 hover:text-white px-3 py-2 rounded-md font-medium
                       ${isActive ? 'text-white' : ''}" style="${activeStyle}">
                           ${d.name}
                       </a>
                       `; })()}
                   `).join('')}
                   <div class="pt-4 border-t border-white/10 space-y-2" id="mobile-auth-container">
                       ${authLinks.replace(/magnetic-btn/g, 'magnetic-btn w-full justify-center').replace(/px-\d+ py-\d+/g, 'px-4 py-3 block text-center')}
                   </div>
               </div>
           </div>
       </nav>
       `;

    const container = document.getElementById('header-container');
    if (container) {
        container.innerHTML = navHTML;
        if (window.lucide) lucide.createIcons();
        window.updateCartDisplay();
        if (window.updateWishlistDisplay) window.updateWishlistDisplay();

        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                const isExpanded = mobileMenu.style.display === 'block';
                mobileMenu.style.display = isExpanded ? 'none' : 'block';
                mobileMenuBtn.querySelector('i').setAttribute('data-lucide', isExpanded ? 'menu' : 'x');

                // Toggle rounded shape
                const header = document.getElementById('site-header');
                if (header) {
                    if (!isExpanded) {
                        header.classList.add('menu-open');
                    } else {
                        header.classList.remove('menu-open');
                    }
                }
                if (window.lucide) lucide.createIcons();
            });
        }
    }
}

window.updateAuthUI = function (user) {
    const divisions = [
        { name: 'Tech Turf', href: '/index.html' },
        { name: 'Quinta', href: '/pages/quinta.html' },
        { name: 'Trend Hive', href: '/pages/trend-hive.html' },
        { name: 'Click Sphere', href: '/pages/click-sphere.html' },
        { name: 'Shop', href: '/pages/shopping.html' }
    ];
    const currentPageFile = window.location.pathname.split('/').pop();
    renderNavHTML(!!user, divisions, currentPageFile);
};

function generateFooter() {
    const footerHTML = `
       <footer class="relative z-10 border-t border-white/5 pt-12 pb-8 bg-[#05080f]/90">
           <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <div class="grid grid-cols-2 md:grid-cols-5 gap-8">
                   <div class="col-span-2 md:col-span-1">
                       <a href="/index.html" class="flex items-center transition-link">
                           <img src="/assets/logos/tech-turf.png" alt="Tech Turf Logo" class="w-8 h-8 object-contain mr-2">
                           <span class="text-xl font-bold tracking-wider text-white">TECH TURF</span>
                       </a>
                       <p class="mt-4 text-gray-400 text-sm max-w-xs">
                           Innovate • Inspire • Ignite. Building the future, one project at a time.
                       </p>
                   </div>
                   <div>
                       <h3 class="text-lg font-semibold text-white mb-4">Company</h3>
                       <ul class="space-y-3 text-sm">
                           <li><a href="/pages/about.html" class="text-gray-400 hover:text-orange-400 transition-link">About Us</a></li>
                           <li><a href="/pages/projects.html" class="text-gray-400 hover:text-orange-400 transition-link">Projects</a></li>
                           <li><a href="/pages/contact.html" class="text-gray-400 hover:text-orange-400 transition-link">Contact</a></li>
                       </ul>
                   </div>
                   <div>
                       <h3 class="text-lg font-semibold text-white mb-4">Divisions</h3>
                       <ul class="space-y-3 text-sm">
                           <li><a href="/pages/quinta.html" class="text-gray-400 hover:text-orange-400 transition-link">Quinta</a></li>
                           <li><a href="/pages/trend-hive.html" class="text-gray-400 hover:text-orange-400 transition-link">Trend Hive</a></li>
                           <li><a href="/pages/click-sphere.html" class="text-gray-400 hover:text-orange-400 transition-link">Click Sphere</a></li>
                           <li><a href="/pages/shopping.html" class="text-gray-400 hover:text-orange-400 transition-link">Shop</a></li>
                       </ul>
                   </div>
                   <div>
                       <h3 class="text-lg font-semibold text-white mb-4">Legal</h3>
                       <ul class="space-y-3 text-sm">
                           <li><a href="/pages/terms-of-service.html" class="text-gray-400 hover:text-orange-400 transition-link">Terms</a></li>
                           <li><a href="/pages/privacy-policy.html" class="text-gray-400 hover:text-orange-400 transition-link">Privacy</a></li>
                       </ul>
                   </div>
                   <div>
                        <h3 class="text-lg font-semibold text-white mb-4">Connect</h3>
                        <ul class="space-y-3 text-sm">
                            <li><a href="/pages/nexus-ai.html" class="text-gray-400 hover:text-orange-400 transition-link">Nexus AI</a></li>
                            <li><a href="/pages/help-center.html" class="text-gray-400 hover:text-orange-400 transition-link">Help Center</a></li>
                            <li><a href="/pages/blog.html" class="text-gray-400 hover:text-orange-400 transition-link">Blog & News</a></li>
                            <li><a href="/pages/search.html" class="text-gray-400 hover:text-orange-400 transition-link">Global Search</a></li>
                            <li><a href="/pages/notifications.html" class="text-gray-400 hover:text-orange-400 transition-link">Notifications</a></li>
                        </ul>
                        <p class="text-gray-400 text-sm mt-6">Coimbatore, India</p>
                   </div>
               </div>
           </div>
       </footer>
       `;
    let container = document.getElementById('footer-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'footer-container';
        document.body.appendChild(container);
    }

    container.innerHTML = footerHTML;
    if (window.lucide) lucide.createIcons();
}

function initNexusWidget() {
    let widget = document.getElementById('nexus-widget');
    if (!widget) {
        widget = document.createElement('div');
        widget.id = 'nexus-widget';
        document.body.appendChild(widget);
    }

    // Reset any old widget markup/panel and rebuild a single reliable button.
    widget.innerHTML = '';

    const toggle = document.createElement('button');
    toggle.id = 'nexus-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Open Nexus AI');
    toggle.innerHTML = '<i data-lucide="message-circle" class="w-6 h-6"></i>';

    Object.assign(toggle.style, {
        position: 'fixed',
        right: '24px',
        bottom: '24px',
        width: '56px',
        height: '56px',
        borderRadius: '9999px',
        border: 'none',
        background: '#ea580c',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: '2147483000',
        boxShadow: '0 18px 35px rgba(0, 0, 0, 0.45)',
        pointerEvents: 'auto'
    });

    toggle.addEventListener('mouseenter', () => {
        toggle.style.background = '#f97316';
    });
    toggle.addEventListener('mouseleave', () => {
        toggle.style.background = '#ea580c';
    });
    toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.location.assign('/pages/nexus-ai.html');
    });

    widget.appendChild(toggle);
    if (window.lucide) lucide.createIcons();
}

/**
 * --- 5. ADVANCED UI EFFECTS ---
 */

// NEW: Initialize Custom Cursor
function initCustomCursor() {
    const cursor = document.createElement('div');
    cursor.id = 'custom-cursor';
    document.body.appendChild(cursor);

    document.addEventListener('mousemove', (e) => {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
    });

    const hoverElements = document.querySelectorAll('a, button, .cursor-hover');
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
    });
}

function handle3DTilt() {
    const tiltElements = document.querySelectorAll('.tilt-3d');
    if (tiltElements.length === 0) return;

    document.addEventListener('mousemove', (e) => {
        tiltElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const maxTilt = 5;
            const x = (e.clientX - centerX) / (rect.width / 2);
            const y = (e.clientY - centerY) / (rect.height / 2);

            const rotateX = -y * maxTilt;
            const rotateY = x * maxTilt;

            el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
    });

    tiltElements.forEach(el => {
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
        });
    });
}

function handleMagneticButtons() {
    const magneticButtons = document.querySelectorAll('.magnetic-btn');
    if (magneticButtons.length === 0) return;

    magneticButtons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const middleX = rect.width / 2;
            const middleY = rect.height / 2;
            const offsetX = ((x - middleX) / middleX) * 15;
            const offsetY = ((y - middleY) / middleY) * 15;

            btn.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = `translate(0, 0)`;
        });
    });
}

function handleSpotlight() {
    const groups = document.querySelectorAll('.spotlight-group');
    groups.forEach(group => {
        group.addEventListener('mousemove', (e) => {
            const rect = group.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            group.style.setProperty('--mouse-x', `${x}px`);
            group.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}

let lastScrollTop = 0;
function handleScrollReveal() {
    const reveals = document.querySelectorAll('.reveal-hidden');
    const windowHeight = window.innerHeight;
    const elementVisible = 50;

    reveals.forEach((reveal) => {
        const rect = reveal.getBoundingClientRect();
        const elementTop = rect.top;

        if (elementTop < windowHeight - elementVisible) {
            reveal.classList.add('reveal-active');
        }
    });

    // Hide Scroll Indicator if scrolled
    const indicator = document.querySelector('.scroll-indicator');
    if (indicator) {
        if (window.scrollY > 100) {
            indicator.style.opacity = '0';
            indicator.style.transform = 'translate(-50%, 20px)';
            indicator.style.pointerEvents = 'none';
        } else {
            indicator.style.opacity = '0.6';
            indicator.style.transform = 'translate(-50%, 0)';
            indicator.style.pointerEvents = 'all';
        }
    }

    // SCROLLYTELLING: Update 3D Scene based on scroll
    // DISABLED: User requested original Earth behavior

    // HEADER SCROLL LOGIC
    const header = document.getElementById('site-header');
    if (header) {
        // Don't hide if mobile menu is open
        if (header.classList.contains('menu-open')) {
            header.classList.remove('header-hidden');
            return;
        }

        const currentScroll = window.scrollY;

        // Hide on scroll down, show on scroll up
        if (currentScroll > lastScrollTop && currentScroll > 150) {
            header.classList.add('header-hidden');
        } else {
            header.classList.remove('header-hidden');
        }
        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    }

    // PARALLAX EFFECT
    const parallaxElements = document.querySelectorAll('.parallax-layer');
    parallaxElements.forEach(element => {
        const speed = element.dataset.speed || 0.5;
        const yPos = -(window.scrollY * speed);
        element.style.transform = `translateY(${yPos}px)`;
    });
}
window.handleScrollReveal = handleScrollReveal;

function handlePageTransitions() {
    document.querySelectorAll('a.transition-link').forEach(link => {
        // Only apply to anchor tags, not buttons
        if (link.tagName !== 'A') return;

        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            // Skip if no href, hash link, mailto, external, or modifier key pressed
            if (!href || href.startsWith('#') || href.startsWith('mailto') ||
                href.startsWith('http') || e.metaKey || e.ctrlKey || e.shiftKey) {
                return;
            }

            // Don't interfere with default browser behavior for these
            if (this.hasAttribute('download') || this.target === '_blank') {
                return;
            }

            e.preventDefault();
            document.body.classList.add('page-transition-out');
            setTimeout(() => {
                window.location.href = href;
            }, 300);
        });
    });
}

function ensureSEO() {
    if (typeof window.applySEO === 'function') {
        window.applySEO();
        return;
    }

    if (!document.querySelector('script[data-seo="true"]')) {
        const script = document.createElement('script');
        script.src = '/src/js/features/seo.js';
        script.defer = true;
        script.dataset.seo = 'true';
        script.onload = () => {
            if (typeof window.applySEO === 'function') {
                window.applySEO();
            }
        };
        document.head.appendChild(script);
    }
}

function enableLazyLoading() {
    document.querySelectorAll('img:not([loading])').forEach((img) => {
        img.setAttribute('loading', 'lazy');
    });
}

// --- 6. 3D BACKGROUND (THREE.JS) ---
let scene, camera, renderer;
let earthMesh, cloudMesh, starMesh;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;

function initThreeJS() {
    const container = document.getElementById('three-container');
    if (!container || !window.THREE) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.z = 1.5; // Zoomed in to see details
    window.camera = camera; // Expose for scrollytelling

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // renderer.setClearColor(0x000000, 1); // Dark background
    container.appendChild(renderer.domElement);

    // --- LIGHTS ---
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    // --- TEXTURE LOADER ---
    const loader = new THREE.TextureLoader();
    // Using standard high-res earth textures
    // Using standard high-res earth textures from reliable sources
    const baseUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/';

    const mapIo = loader.load(baseUrl + 'earth_atmos_2048.jpg');
    const mapSpecular = loader.load(baseUrl + 'earth_specular_2048.jpg');
    const mapNormal = loader.load(baseUrl + 'earth_normal_2048.jpg');
    const mapClouds = loader.load(baseUrl + 'earth_clouds_1024.png');

    // --- EARTH ---
    const geometry = new THREE.SphereGeometry(0.5, 64, 64); // 0.5 radius
    const material = new THREE.MeshPhongMaterial({
        map: mapIo,
        specularMap: mapSpecular,
        normalMap: mapNormal,
        specular: new THREE.Color(0x333333),
        shininess: 5
    });
    earthMesh = new THREE.Mesh(geometry, material);
    window.earthMesh = earthMesh; // Expose for scrollytelling
    scene.add(earthMesh);

    // --- CLOUDS ---
    const cloudGeometry = new THREE.SphereGeometry(0.505, 64, 64);
    const cloudMaterial = new THREE.MeshPhongMaterial({
        map: mapClouds,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(cloudMesh);

    // --- STARS BACKGROUND ---
    const starGeo = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPos = [];
    for (let i = 0; i < starCount; i++) {
        const x = (Math.random() - 0.5) * 100;
        const y = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100; // Far background
        starPos.push(x, y, z);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 });
    starMesh = new THREE.Points(starGeo, starMat);
    scene.add(starMesh);

    window.addEventListener('resize', onWindowResize, false);
    // REMOVED: Cursor-dependent mousemove listener for 3D Earth
    // document.addEventListener('mousemove', onDocumentMouseMove, false);
    animate();
}

function onWindowResize() {
    if (!camera || !renderer) return;
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // Autonomous rotation based on time, NO mouse dependency
    const time = performance.now() * 0.0005;
    
    earthMesh.rotation.y = time * 0.1;
    cloudMesh.rotation.y = time * 0.12;

    // Subtle floating tilt
    scene.rotation.x = Math.sin(time) * 0.05;
    scene.rotation.z = Math.cos(time * 0.5) * 0.05;

    renderer.render(scene, camera);
}

// --- 7. CONTENT PROTECTION ---
function initContentProtection() {
    // Disable context menu (Right Click) - but allow on input fields
    document.addEventListener('contextmenu', (e) => {
        // Allow right-click on input fields for paste, etc.
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        e.preventDefault();
        showMessage('error', 'Content copying is restricted.');
    });

    // Disable specific keyboard shortcuts (but allow essential ones)
    document.addEventListener('keydown', (e) => {
        // ALWAYS allow F5, Ctrl+R (Refresh), Ctrl+Shift+R (Hard Refresh)
        if (e.key === 'F5' ||
            (e.ctrlKey && e.key === 'r') ||
            (e.ctrlKey && e.key === 'R') ||
            (e.ctrlKey && e.shiftKey && e.key === 'R')) {
            return; // Allow refresh
        }

        // Allow Ctrl+A (Select All) in input fields
        if (e.ctrlKey && (e.key === 'a' || e.key === 'A') &&
            (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            return;
        }

        // Block copy, view source, save, print
        if (
            e.ctrlKey &&
            (e.key === 'c' || e.key === 'C' || e.key === 'u' || e.key === 'U' ||
                e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P')
        ) {
            e.preventDefault();
            showMessage('error', 'Keyboard shortcuts are restricted.');
            return;
        }

        // Optionally block F12 and DevTools (commented out to not annoy developers)
        // if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        //     e.preventDefault();
        // }
    });

    // Disable Dragging of images/content
    document.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'IMG' || e.target.tagName === 'A') {
            e.preventDefault();
        }
    });
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    const authRoute = isAuthRoute();

    if (!authRoute) {
        generateHeader();
        generateFooter();
    }

    updateCartDisplay();
    updateWishlistDisplay();
    hydrateCartFromServer();
    hydrateWishlistFromServer();
    hydrateCompareFromServer();

    // Initialize scroll reveal on all pages
    handleScrollReveal();
    window.addEventListener('scroll', handleScrollReveal);

    if (document.body.getAttribute('data-3d-enabled') === 'true') {
        initThreeJS();
    }

    handlePageTransitions();
    initContentProtection(); // Enable content protection
    if (!authRoute) {
        initNexusWidget();
    }
    ensureSEO();
    enableLazyLoading();

    if (window.lucide) lucide.createIcons();
});