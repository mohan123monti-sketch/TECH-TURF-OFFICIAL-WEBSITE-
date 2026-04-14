// Admin Dashboard JavaScript
const API_BASE = window.API_BASE_URL || window.__TECHTURF_API_BASE__ || 'http://localhost:5000/api';
const API_ORIGIN = new URL(API_BASE).origin;

let currentTab = 'dashboard';
let charts = {};
let currentEditingProduct = null;
let currentEditingPromo = null;
let currentOrdersCache = [];

function normalizeImageUrl(url) {
    if (!url) return '';

    const value = String(url).trim().replace(/\\/g, '/');
    if (!value) return '';

    if (/^data:image\//i.test(value) || /^https?:\/\//i.test(value) || value.startsWith('//')) {
        return value;
    }

    if (value.startsWith('/')) {
        return `${API_ORIGIN}${value}`;
    }

    return `${API_ORIGIN}/${value}`;
}

// Initialize with token check and retry logic
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in with retry logic
    let token = localStorage.getItem('tt_token') || localStorage.getItem('token');
    
    // If no token found, wait a moment for localStorage to sync (handles redirect timing issues)
    if (!token) {
        console.log('[ADMIN DASHBOARD] Token not found. Checking again in 500ms...');
        setTimeout(() => {
            token = localStorage.getItem('tt_token') || localStorage.getItem('token');
            
            if (!token) {
                console.error('[ADMIN DASHBOARD] No token found after retry. Redirecting to login...');
                console.log('[DEBUG] localStorage keys:', Object.keys(localStorage));
                alert('Please login first to access admin dashboard');
                window.location.href = '/pages/login.html';
            } else {
                console.log('[ADMIN DASHBOARD] Token found after retry. Initializing dashboard...');
                initializeDashboard();
            }
        }, 500);
    } else {
        console.log('[ADMIN DASHBOARD] Token found on first check. Initializing dashboard...');
        initializeDashboard();
    }
});

// Initialize Dashboard
function initializeDashboard() {
    setupCharts();
    loadDashboardData();
}

// Switch Tabs
function switchTab(tab) {
    // Hide all tabs using exact ID selectors
    const tabIds = ['dashboard', 'orders', 'inventory', 'analytics', 'promos', 'media', 'announcements', 'content'];
    tabIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // Show selected tab
    const tabEl = document.getElementById(tab);
    if (tabEl) tabEl.style.display = 'block';
    
    // Update sidebar active state
    document.querySelectorAll('[id^="nav"]').forEach(el => el.classList.remove('sidebar-active'));
    const navEl = document.getElementById(`nav${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (navEl) navEl.classList.add('sidebar-active');
    
    // Update page title
    const titles = { 
        dashboard: 'Dashboard', 
        orders: 'Orders', 
        inventory: 'Inventory', 
        analytics: 'Analytics', 
        promos: 'Promos',
        media: 'Media Library',
        announcements: 'Announcements',
        content: 'Website Editor'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[tab];
    
    currentTab = tab;
    
    // Load tab specific data
    if (tab === 'orders') loadOrders();
    if (tab === 'inventory') loadInventory();
    if (tab === 'analytics') loadAnalytics();
    if (tab === 'promos') loadPromos();
    if (tab === 'media') loadMedia();
    if (tab === 'announcements') loadAnnouncements();
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
        if (!token) {
            throw new Error('Session expired. Please login again.');
        }

        const statsRequest = fetch(`${API_BASE}/stats/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(async (response) => {
            if (response.status === 401) throw new Error('Session expired. Please login again.');
            if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch stats`);
            return response.json();
        }).catch((error) => {
            console.error('Dashboard stats fetch failed:', error);
            return {};
        });

        const ordersRequest = fetch(`${API_BASE}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(async (response) => {
            if (response.status === 401) throw new Error('Session expired. Please login again.');
            if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch orders`);
            return response.json();
        }).catch((error) => {
            console.error('Dashboard orders fetch failed:', error);
            return [];
        });

        const productsRequest = fetch(`${API_BASE}/products`).then(async (response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch products`);
            return response.json();
        }).catch((error) => {
            console.error('Dashboard products fetch failed:', error);
            return [];
        });

        const [stats, orders, products] = await Promise.all([statsRequest, ordersRequest, productsRequest]);
        const safeOrders = Array.isArray(orders) ? orders : [];
        const safeProducts = Array.isArray(products) ? products : [];
        currentOrdersCache = safeOrders;

        const totalRevenue = Number(
            stats.totalRevenue ?? safeOrders.reduce((sum, order) => sum + Number(order.totalPrice || order.total_price || 0), 0)
        ) || 0;
        const totalOrders = Number(stats.totalOrders ?? safeOrders.length) || 0;
        const totalProducts = Number(stats.totalProducts ?? safeProducts.length) || 0;
        const activeUsers = Number(stats.activeUsers ?? 0) || 0;

        const revenueEl = document.getElementById('revenue');
        const ordersEl = document.getElementById('totalOrders');
        const productsEl = document.getElementById('totalProducts');
        const usersEl = document.getElementById('activeUsers');

        if (revenueEl) revenueEl.textContent = totalRevenue.toFixed(0);
        if (ordersEl) ordersEl.textContent = totalOrders;
        if (productsEl) productsEl.textContent = totalProducts;
        if (usersEl) usersEl.textContent = activeUsers;

        if (safeOrders.length > 0) {
            loadRecentOrders(safeOrders.slice(0, 5));
            updateCharts(safeOrders);
        } else {
            const tbody = document.getElementById('recentOrdersBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">No recent orders found</td></tr>';
            }
        }
    } catch (err) {
        console.error('Dashboard error:', err);
        if (err.message.includes('Session expired')) {
            localStorage.removeItem('tt_token');
            localStorage.removeItem('token');
            alert('Your session has expired. Please login again.');
            window.location.href = '/pages/login.html';
            return;
        }

        const revenueEl = document.getElementById('revenue');
        const ordersEl = document.getElementById('totalOrders');
        const productsEl = document.getElementById('totalProducts');
        const usersEl = document.getElementById('activeUsers');

        if (revenueEl) revenueEl.textContent = '0';
        if (ordersEl) ordersEl.textContent = '0';
        if (productsEl) productsEl.textContent = '0';
        if (usersEl) usersEl.textContent = '0';

        const tbody = document.getElementById('recentOrdersBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-red-600">Unable to load recent orders</td></tr>';
        }
    }
}

// Load Recent Orders
function loadRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersBody');
    if (!tbody) {
        console.warn('Element recentOrdersBody not found');
        return;
    }
    tbody.innerHTML = '';
    
    orders.forEach(order => {
        const orderId = String(order._id || order.id || '');
        const shortOrderId = orderId ? orderId.slice(-8) : 'N/A';
        const orderTotal = Number(order.totalPrice || order.total_price || 0);
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        row.innerHTML = `
            <td class="py-3 px-4 text-sm">${shortOrderId}</td>
            <td class="py-3 px-4 text-sm">${order.user?.email || 'Guest'}</td>
            <td class="py-3 px-4 text-sm">INR ${orderTotal.toFixed(0)}</td>
            <td class="py-3 px-4">
                <span class="status-${order.status?.toLowerCase() || 'pending'}">
                    ${order.status || 'Pending'}
                </span>
            </td>
            <td class="py-3 px-4">
                <button onclick="viewOrder('${orderId}')" class="text-orange-600 hover:underline text-sm">View</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load All Orders
async function loadOrders() {
    try {
        const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
        
        if (!token) {
            throw new Error('Session expired. Please login again.');
        }
        
        let res = await fetch(`${API_BASE}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401) {
            localStorage.removeItem('tt_token');
            localStorage.removeItem('token');
            alert('Your session has expired. Please login again.');
            window.location.href = '/pages/login.html';
            return;
        }
        
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch orders`);
        const orders = await res.json();
        
        const tbody = document.getElementById('allOrdersBody');
        if (!tbody) {
            console.warn('Element allOrdersBody not found');
            return;
        }
        tbody.innerHTML = '';
        
        if (!Array.isArray(orders) || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8">No orders found</td></tr>';
            return;
        }
        
        orders.forEach(order => {
            const orderId = String(order._id || order.id || '');
            const shortOrderId = orderId ? orderId.slice(-8) : 'N/A';
            const orderTotal = Number(order.totalPrice || order.total_price || 0);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="py-3 px-4 text-sm">${shortOrderId}</td>
                <td class="py-3 px-4 text-sm">${order.user?.email || 'N/A'}</td>
                <td class="py-3 px-4 text-sm">INR ${orderTotal.toFixed(0)}</td>
                <td class="py-3 px-4">
                    <span class="status-${order.status?.toLowerCase() || 'pending'}">
                        ${order.status || 'Pending'}
                    </span>
                </td>
                <td class="py-3 px-4 text-sm">${order.paymentMethod || 'COD'}</td>
                <td class="py-3 px-4">
                    <button onclick="editOrder('${orderId}')" class="text-blue-600 hover:underline text-xs">Edit</button>
                    <button onclick="deleteOrder('${orderId}')" class="text-red-600 hover:underline text-xs">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error('Load orders error:', err);
        const tbody = document.getElementById('allOrdersBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-600">Error: ${err.message}</td></tr>`;
        }
    }
}

// Load Inventory
async function loadInventory() {
    try {
        const res = await fetch(`${API_BASE}/products`);
        const products = await res.json();
        window.__adminProductsCache = Array.isArray(products) ? products : [];
        
        const grid = document.getElementById('inventoryGrid');
        if (!grid) {
            console.warn('Element inventoryGrid not found');
            return;
        }
        grid.innerHTML = '';
        
        products.forEach(product => {
            const productId = product.id || product._id;
            const imageSrc = normalizeImageUrl(product.image_url || product.imageUrl || product.image || '/public/images/space-bg.png');
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg p-4 shadow hover:shadow-lg';
            card.innerHTML = `
                <img src="${imageSrc}" alt="${product.name}" class="w-full h-40 object-cover rounded mb-3">
                <h4 class="font-semibold text-sm">${product.name}</h4>
                <p class="text-gray-600 text-xs">INR ${product.price}</p>
                <div class="mt-2 flex justify-between items-center">
                    <span class="text-xs ${product.stock > 5 ? 'text-green-600' : 'text-red-600'}">Stock: ${product.stock}</span>
                    <div class="flex items-center gap-3">
                        <button onclick="editProduct('${productId}')" class="text-orange-600 text-xs hover:underline">Edit</button>
                        <button onclick="deleteProduct('${productId}')" class="text-red-600 text-xs hover:underline">Delete</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Load inventory error:', err);
        const grid = document.getElementById('inventoryGrid');
        if (grid) {
            grid.innerHTML = '<div class="col-span-full text-center py-8">Error loading inventory</div>';
        }
    }
}

// Load Analytics
async function loadAnalytics() {
    try {
        const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
        
        if (!token) {
            throw new Error('Session expired. Please login again.');
        }
        
        // Fetch analytics data from admin endpoint
        let res = await fetch(`${API_BASE}/admin/analytics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 404) {
            res = await fetch(`${API_BASE}/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
        
        if (res.status === 401) {
            localStorage.removeItem('tt_token');
            localStorage.removeItem('token');
            alert('Your session has expired. Please login again.');
            window.location.href = '/pages/login.html';
            return;
        }
        
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch analytics`);
        const data = await res.json();
        
        // Extract metrics from response
        const metrics = data.metrics || {};
        const topProducts = data.topProducts || [];
        const topCategories = data.topCategories || [];
        
        // Update metrics
        const avgEl = document.getElementById('avgOrderValue');
        const convEl = document.getElementById('conversionRate');
        const catEl = document.getElementById('topCategory');
        
        if (avgEl) avgEl.textContent = metrics.avgOrderValue || '0';
        if (convEl) convEl.textContent = metrics.conversions ? (parseFloat(metrics.conversions) / (metrics.totalOrders || 1)).toFixed(1) : '0';
        if (catEl) catEl.textContent = topCategories.length > 0 ? topCategories[0]._id : '-';
        
    } catch (err) {
        console.error('Load analytics error:', err);
        const avgEl = document.getElementById('avgOrderValue');
        const convEl = document.getElementById('conversionRate');
        const catEl = document.getElementById('topCategory');
        
        if (avgEl) avgEl.textContent = 'Error';
        if (convEl) convEl.textContent = 'Error';
        if (catEl) catEl.textContent = 'Error';
    }
}

// Load Promos
async function loadPromos() {
    try {
        const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
        
        if (!token) {
            throw new Error('Session expired. Please login again.');
        }
        
        const res = await fetch(`${API_BASE}/promos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401) {
            localStorage.removeItem('tt_token');
            localStorage.removeItem('token');
            alert('Your session has expired. Please login again.');
            window.location.href = '/pages/login.html';
            return;
        }
        
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch promos`);
        const promos = await res.json();
        window.__adminPromosCache = Array.isArray(promos) ? promos : [];
        
        const tbody = document.getElementById('promosBody');
        if (!tbody) {
            console.warn('Element promosBody not found');
            return;
        }
        tbody.innerHTML = '';
        
        if (!Array.isArray(promos) || promos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8">No promos found</td></tr>';
            return;
        }
        
        promos.forEach(promo => {
            const row = document.createElement('tr');
            const startDate = new Date(promo.startsAt).toLocaleDateString();
            const endDate = new Date(promo.endsAt).toLocaleDateString();
            
            row.innerHTML = `
                <td class="py-3 px-4 text-sm font-semibold">${promo.code}</td>
                <td class="py-3 px-4 text-sm">${promo.type === 'percent' ? '%' : 'INR'}</td>
                <td class="py-3 px-4 text-sm">${promo.value}</td>
                <td class="py-3 px-4 text-sm">INR ${promo.minOrderValue || 0}</td>
                <td class="py-3 px-4 text-xs">${startDate} - ${endDate}</td>
                <td class="py-3 px-4">
                    <button onclick="editPromo('${promo._id}')" class="text-blue-600 text-xs hover:underline">Edit</button>
                    <button onclick="deletePromo('${promo._id}')" class="text-red-600 text-xs hover:underline">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error('Load promos error:', err);
        const tbody = document.getElementById('promosBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-600">Error: ${err.message}</td></tr>`;
        }
    }
}

// Setup Charts
function setupCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        charts.revenue = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue (INR)',
                    data: [],
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
    
    // Status Chart
    const statusCtx = document.getElementById('statusChart');
    if (statusCtx) {
        charts.status = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: ['#fbbf24', '#3b82f6', '#10b981', '#ef4444']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
    
    // Daily Sales Chart
    const dailyCtx = document.getElementById('dailySalesChart');
    if (dailyCtx) {
        charts.daily = new Chart(dailyCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Daily Sales (INR)',
                    data: [],
                    backgroundColor: '#f97316'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
}

// Update Charts with Data
function updateCharts(orders) {
    if (!Array.isArray(orders) || orders.length === 0) return;
    
    // Update Status Distribution Chart
    if (charts.status) {
        const statusCount = {};
        orders.forEach(order => {
            const status = order.status || 'Unknown';
            statusCount[status] = (statusCount[status] || 0) + 1;
        });
        
        charts.status.data.labels = Object.keys(statusCount);
        charts.status.data.datasets[0].data = Object.values(statusCount);
        charts.status.update();
    }
    
    // Update Revenue Chart with last 7 days of data
    if (charts.revenue) {
        const last7Days = {};
        const today = new Date();
        
        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
            last7Days[dateStr] = 0;
        }
        
        // Aggregate orders by date
        orders.forEach(order => {
            const orderDate = new Date(order.createdAt);
            const dateStr = orderDate.toLocaleDateString('en-US', { weekday: 'short' });
            if (dateStr in last7Days) {
                last7Days[dateStr] += order.totalPrice || 0;
            }
        });
        
        charts.revenue.data.labels = Object.keys(last7Days);
        charts.revenue.data.datasets[0].data = Object.values(last7Days);
        charts.revenue.update();
    }
}

// Modal Functions
function showAddProductModal() {
    currentEditingProduct = null;
    const form = document.getElementById('productForm');
    if (form) form.reset();
    const title = document.getElementById('productModalTitle');
    if (title) title.textContent = 'New Product';
    openModal('productModal');
}

function showAddPromoModal() {
    currentEditingPromo = null;
    const form = document.getElementById('promoForm');
    if (form) form.reset();
    const active = document.getElementById('promoActive');
    if (active) active.checked = true;
    const title = document.getElementById('promoModalTitle');
    if (title) title.textContent = 'New Promo';
    openModal('promoModal');
}

// Action Functions
function viewOrder(orderId) {
    const order = currentOrdersCache.find(item => String(item._id || item.id) === String(orderId));
    if (!order) {
        alert('Order not found');
        return;
    }

    alert(`Order ${String(order._id || order.id).slice(-8)} | INR ${Number(order.totalPrice || 0).toFixed(2)} | ${order.status || 'Pending'}`);
}

function editOrder(orderId) {
    const order = currentOrdersCache.find(item => String(item._id || item.id) === String(orderId));
    if (!order) {
        alert('Order not found');
        return;
    }

    const nextStatus = prompt('Update order status (Pending, Processing, Shipped, Delivered, Cancelled):', order.status || 'Pending');
    if (!nextStatus) return;

    const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
    fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: nextStatus })
    }).then(res => {
        if (!res.ok) throw new Error('Failed to update order');
        return res.json();
    }).then(() => {
        loadOrders();
        alert('Order updated successfully');
    }).catch(err => {
        console.error('Edit order error:', err);
        alert(err.message);
    });
}

function deleteOrder(orderId) {
    if (confirm('Delete this order?')) {
        const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
        fetch(`${API_BASE}/orders/${orderId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).then(res => {
            if (!res.ok) throw new Error('Failed to delete order');
            loadOrders();
            loadDashboardData();
            alert('Order deleted successfully');
        }).catch(err => {
            console.error('Delete order error:', err);
            alert(err.message);
        });
    }
}

function editProduct(productId) {
    const product = (window.__adminProductsCache || []).find(item => String(item._id || item.id) === String(productId));
    if (!product) {
        alert('Product not found');
        return;
    }

    currentEditingProduct = productId;
    const title = document.getElementById('productModalTitle');
    if (title) title.textContent = 'Edit Product';
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productPrice').value = product.price ?? '';
    document.getElementById('productStock').value = product.stock ?? 0;
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productStatus').value = product.status || 'active';
    document.getElementById('productImageUrl').value = product.image_url || product.imageUrl || '';
    openModal('productModal');
}

function deleteProduct(productId) {
    if (!confirm('Delete this product?')) return;

    const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
    fetch(`${API_BASE}/products/${productId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }).then(res => {
        if (!res.ok) throw new Error('Failed to delete product');
        loadInventory();
        loadDashboardData();
        alert('Product deleted successfully');
    }).catch(err => {
        console.error('Delete product error:', err);
        alert(err.message);
    });
}

function filterProducts() {
    const searchInput = document.getElementById('productSearch');
    if (!searchInput) {
        console.warn('Element productSearch not found');
        return;
    }
    const search = searchInput.value.toLowerCase();
    document.querySelectorAll('#inventoryGrid > div').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(search) ? 'block' : 'none';
    });
}

function editPromo(promoId) {
    const promo = (window.__adminPromosCache || []).find(item => String(item._id || item.id) === String(promoId));
    if (!promo) {
        alert('Promo not found');
        return;
    }

    currentEditingPromo = promoId;
    const title = document.getElementById('promoModalTitle');
    if (title) title.textContent = 'Edit Promo';
    document.getElementById('promoCode').value = promo.code || '';
    document.getElementById('promoType').value = promo.type || 'percent';
    document.getElementById('promoValue').value = promo.value ?? '';
    document.getElementById('promoMinOrder').value = promo.minOrder ?? promo.minOrderValue ?? 0;
    document.getElementById('promoExpiryDate').value = promo.expiryDate ? new Date(promo.expiryDate).toISOString().slice(0, 16) : '';
    document.getElementById('promoActive').checked = Boolean(promo.isActive);
    openModal('promoModal');
}

function deletePromo(promoId) {
    if (confirm('Delete this promo?')) {
        const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
        fetch(`${API_BASE}/promos/${promoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).then(res => {
            if (!res.ok) throw new Error('Failed to delete promo');
            loadPromos();
            alert('Promo deleted successfully');
        }).catch(err => {
            console.error('Delete promo error:', err);
            alert(err.message);
        });
    }
}

function exportOrders() {
    const orders = Array.isArray(currentOrdersCache) ? currentOrdersCache : [];
    if (orders.length === 0) {
        alert('No orders to export');
        return;
    }

    const rows = [
        ['Order ID', 'Customer', 'Email', 'Date', 'Total', 'Status', 'Payment Method'],
        ...orders.map(order => [
            String(order._id || order.id || ''),
            String(order.userName || order.user?.name || 'Guest'),
            String(order.userEmail || order.user?.email || ''),
            String(order.createdAt || order.created_at || ''),
            String(Number(order.totalPrice || 0).toFixed(2)),
            String(order.status || 'Pending'),
            String(order.paymentMethod || 'COD')
        ])
    ];

    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tech-turf-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function closeProductModal() {
    currentEditingProduct = null;
    closeModal('productModal');
    const fileInput = document.getElementById('productImageFile');
    const previewContainer = document.getElementById('productImagePreviewContainer');
    const preview = document.getElementById('productImagePreview');
    if (fileInput) fileInput.value = '';
    if (previewContainer) previewContainer.classList.add('hidden');
    if (preview) preview.src = '';
}

function closePromoModal() {
    currentEditingPromo = null;
    closeModal('promoModal');
}

async function saveProduct(event) {
    event.preventDefault();

    const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
    const isEdit = Boolean(currentEditingProduct);
    const fileInput = document.getElementById('productImageFile');
    const payload = {
        name: document.getElementById('productName').value.trim(),
        description: document.getElementById('productDescription').value.trim(),
        price: Number(document.getElementById('productPrice').value),
        stock: Number(document.getElementById('productStock').value),
        category: document.getElementById('productCategory').value.trim(),
        image_url: document.getElementById('productImageUrl').value.trim(),
        status: document.getElementById('productStatus').value
    };

    const selectedFile = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    if (selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);

        const uploadResponse = await fetch(`${API_BASE}/media/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: uploadFormData
        });

        if (!uploadResponse.ok) {
            const error = await uploadResponse.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to upload product image');
        }

        const uploadData = await uploadResponse.json();
        const uploadedImageUrl = normalizeImageUrl(uploadData.imageUrl || uploadData.url || uploadData.filepath || '');
        payload.image_url = uploadedImageUrl;
        payload.imageUrl = uploadedImageUrl;
    } else if (payload.image_url) {
        payload.image_url = normalizeImageUrl(payload.image_url);
        payload.imageUrl = payload.image_url;
    }

    const url = currentEditingProduct ? `${API_BASE}/products/${currentEditingProduct}` : `${API_BASE}/products`;
    const method = currentEditingProduct ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to save product');
    }

    await res.json();
    closeProductModal();
    await loadInventory();
    alert(isEdit ? 'Product updated successfully' : 'Product created successfully');
}

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('productImageFile');
    const previewContainer = document.getElementById('productImagePreviewContainer');
    const preview = document.getElementById('productImagePreview');

    if (fileInput && previewContainer && preview) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files && fileInput.files[0];
            if (!file) {
                preview.src = '';
                previewContainer.classList.add('hidden');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                preview.src = event.target?.result || '';
                previewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        });
    }
});

async function savePromo(event) {
    event.preventDefault();

    const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
    const isEdit = Boolean(currentEditingPromo);
    const payload = {
        code: document.getElementById('promoCode').value.trim().toUpperCase(),
        type: document.getElementById('promoType').value,
        value: Number(document.getElementById('promoValue').value),
        minOrder: Number(document.getElementById('promoMinOrder').value),
        expiryDate: document.getElementById('promoExpiryDate').value || null,
        isActive: document.getElementById('promoActive').checked
    };

    const url = currentEditingPromo ? `${API_BASE}/promos/${currentEditingPromo}` : `${API_BASE}/promos`;
    const method = currentEditingPromo ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to save promo');
    }

    await res.json();
    closePromoModal();
    await loadPromos();
    alert(isEdit ? 'Promo updated successfully' : 'Promo created successfully');
}

function logout() {
    if (confirm('Logout?')) {
        localStorage.removeItem('tt_token');
        localStorage.removeItem('token');
        window.location.href = '/pages/login.html';
    }
}

// ==================== MEDIA LIBRARY ====================

let currentEditingAnnouncement = null;
let currentEditingPage = null;

// Load Media
async function loadMedia() {
    try {
        const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
        
        if (!token) {
            throw new Error('Session expired. Please login again.');
        }
        
        const res = await fetch(`${API_BASE}/media`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401) {
            localStorage.removeItem('tt_token');
            localStorage.removeItem('token');
            alert('Your session has expired. Please login again.');
            window.location.href = '/pages/login.html';
            return;
        }
        
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch media`);
        const data = await res.json();
        const files = Array.isArray(data) ? data : (data.files || data.media || []);
        
        const grid = document.getElementById('mediaGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (files.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-8 text-gray-500">No images uploaded yet</div>';
            return;
        }
        
        files.forEach(file => {
            const card = document.createElement('div');
            card.className = 'relative group bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow';
            card.innerHTML = `
                <img src="${file.path || file.filepath || file.url || ''}" alt="${file.filename}" class="w-full h-40 object-cover">
                <div class="p-2">
                    <p class="text-xs text-gray-600 truncate" title="${file.filename}">${file.filename}</p>
                    <p class="text-xs text-gray-400">${(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button onclick="copyImageUrl('${file.path || file.filepath || file.url || ''}')" class="bg-white text-gray-800 px-3 py-1 rounded mr-2 text-xs hover:bg-gray-100">Copy URL</button>
                    <button onclick="deleteImage('${file.id || file._id || ''}')" class="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700">Delete</button>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Load media error:', err);
        const grid = document.getElementById('mediaGrid');
        if (grid) {
            grid.innerHTML = `<div class="col-span-full text-center py-8 text-red-600">Error: ${err.message}</div>`;
        }
    }
}

// Show Upload Modal
function showUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

// Close Upload Modal
function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    document.getElementById('imageUpload').value = '';
    document.getElementById('uploadProgress').classList.add('hidden');
    document.getElementById('uploadBar').style.width = '0%';
}

// Upload Images
async function uploadImages() {
    const fileInput = document.getElementById('imageUpload');
    const files = fileInput.files;
    
    if (!files || files.length === 0) {
        alert('Please select at least one image');
        return;
    }
    
    const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
    if (!token) {
        alert('Please login first');
        return;
    }
    
    const formData = new FormData();
    for (let file of files) {
        formData.append('files', file);
    }
    
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('uploadBar');
    const statusText = document.getElementById('uploadStatus');
    
    progressDiv.classList.remove('hidden');
    
    try {
        const res = await fetch(`${API_BASE}/upload/multi`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Upload failed');
        }
        
        progressBar.style.width = '100%';
        statusText.textContent = 'Upload complete!';
        
        setTimeout(() => {
            closeUploadModal();
            loadMedia();
        }, 1000);
    } catch (err) {
        console.error('Upload error:', err);
        alert('Upload failed: ' + err.message);
        progressDiv.classList.add('hidden');
    }
}

// Copy Image URL
function copyImageUrl(url) {
    const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
    navigator.clipboard.writeText(fullUrl).then(() => {
        alert('URL copied to clipboard!');
    }).catch(err => {
        console.error('Copy failed:', err);
        prompt('Copy this URL:', fullUrl);
    });
}

// Delete Image
async function deleteImage(id) {
    if (!confirm('Delete this image?')) return;
    
    try {
        const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
        
        const res = await fetch(`${API_BASE}/media/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!res.ok) throw new Error('Delete failed');
        
        alert('Image deleted successfully');
        loadMedia();
    } catch (err) {
        console.error('Delete error:', err);
        alert('Failed to delete image');
    }
}

// Filter Media
function filterMedia() {
    const searchInput = document.getElementById('mediaSearch');
    if (!searchInput) return;
    
    const search = searchInput.value.toLowerCase();
    const cards = document.querySelectorAll('#mediaGrid > div');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(search) ? 'block' : 'none';
    });
}

// ==================== ANNOUNCEMENTS ====================

// Load Announcements
async function loadAnnouncements() {
    try {
        const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
        
        if (!token) {
            throw new Error('Session expired. Please login again.');
        }
        
        const res = await fetch(`${API_BASE}/announcements`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401) {
            localStorage.removeItem('tt_token');
            localStorage.removeItem('token');
            alert('Your session has expired. Please login again.');
            window.location.href = '/pages/login.html';
            return;
        }
        
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch announcements`);
        const announcements = await res.json();
        const items = Array.isArray(announcements) ? announcements : (announcements.announcements || announcements.items || []);
        
        const tbody = document.getElementById('announcementsBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8">No announcements found</td></tr>';
            return;
        }
        
        items.forEach(announcement => {
            const row = document.createElement('tr');
            const startDate = new Date(announcement.startDate).toLocaleDateString();
            const endDate = announcement.endDate ? new Date(announcement.endDate).toLocaleDateString() : 'No end';
            
            row.innerHTML = `
                <td class="py-3 px-4 text-sm font-semibold">${announcement.title}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 rounded text-xs font-medium bg-${getAnnouncementColor(announcement.type)}-100 text-${getAnnouncementColor(announcement.type)}-800">
                        ${announcement.type}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <button onclick="toggleAnnouncement('${announcement._id}')" class="px-2 py-1 rounded text-xs font-medium ${announcement.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                        ${announcement.isActive ? 'Active' : 'Inactive'}
                    </button>
                </td>
                <td class="py-3 px-4 text-xs">${startDate} - ${endDate}</td>
                <td class="py-3 px-4 text-xs">${announcement.showOnPages?.join(', ') || 'all'}</td>
                <td class="py-3 px-4">
                    <button onclick="editAnnouncement('${announcement._id}')" class="text-blue-600 text-xs hover:underline mr-2">Edit</button>
                    <button onclick="deleteAnnouncement('${announcement._id}')" class="text-red-600 text-xs hover:underline">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error('Load announcements error:', err);
        const tbody = document.getElementById('announcementsBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-600">Error: ${err.message}</td></tr>`;
        }
    }
}

// Get Announcement Color
function getAnnouncementColor(type) {
    const colors = {
        info: 'blue',
        warning: 'yellow',
        success: 'green',
        error: 'red',
        promo: 'purple'
    };
    return colors[type] || 'gray';
}

// Show Add Announcement Modal
function showAddAnnouncementModal() {
    currentEditingAnnouncement = null;
    document.getElementById('announcementModalTitle').textContent = 'New Announcement';
    document.getElementById('announcementForm').reset();
    document.getElementById('announcementActive').checked = true;
    
    const modal = document.getElementById('announcementModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

// Close Announcement Modal
function closeAnnouncementModal() {
    const modal = document.getElementById('announcementModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    currentEditingAnnouncement = null;
}

// Edit Announcement
async function editAnnouncement(id) {
    try {
        const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
        
        const res = await fetch(`${API_BASE}/announcements`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to fetch announcement');
        const announcements = await res.json();
        const items = Array.isArray(announcements) ? announcements : (announcements.announcements || announcements.items || []);

        const announcement = items.find(a => String(a.id || a._id) === String(id));
        if (!announcement) throw new Error('Announcement not found');
        
        currentEditingAnnouncement = id;
        document.getElementById('announcementModalTitle').textContent = 'Edit Announcement';
        document.getElementById('announcementTitle').value = announcement.title;
        document.getElementById('announcementMessage').value = announcement.message;
        document.getElementById('announcementType').value = announcement.type;
        document.getElementById('announcementPriority').value = announcement.priority;
        
        if (announcement.startDate) {
            document.getElementById('announcementStartDate').value = new Date(announcement.startDate).toISOString().slice(0, 16);
        }
        if (announcement.endDate) {
            document.getElementById('announcementEndDate').value = new Date(announcement.endDate).toISOString().slice(0, 16);
        }
        
        document.getElementById('announcementLink').value = announcement.link || '';
        document.getElementById('announcementLinkText').value = announcement.linkText || 'Learn More';
        document.getElementById('announcementActive').checked = announcement.isActive;
        
        const modal = document.getElementById('announcementModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    } catch (err) {
        console.error('Edit announcement error:', err);
        alert('Failed to load announcement');
    }
}

// Delete Announcement
async function deleteAnnouncement(id) {
    if (!confirm('Delete this announcement?')) return;
    
    try {
        const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
        
        const res = await fetch(`${API_BASE}/announcements/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!res.ok) throw new Error('Delete failed');
        
        alert('Announcement deleted successfully');
        loadAnnouncements();
    } catch (err) {
        console.error('Delete error:', err);
        alert('Failed to delete announcement');
    }
}

// Toggle Announcement
async function toggleAnnouncement(id) {
    try {
        const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
        
        const res = await fetch(`${API_BASE}/announcements/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!res.ok) throw new Error('Toggle failed');
        
        loadAnnouncements();
    } catch (err) {
        console.error('Toggle error:', err);
        alert('Failed to toggle announcement');
    }
}

// Handle Announcement Form Submit
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('announcementForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
            
            const data = {
                title: document.getElementById('announcementTitle').value,
                message: document.getElementById('announcementMessage').value,
                type: document.getElementById('announcementType').value,
                priority: parseInt(document.getElementById('announcementPriority').value),
                startDate: document.getElementById('announcementStartDate').value,
                endDate: document.getElementById('announcementEndDate').value || null,
                link: document.getElementById('announcementLink').value || null,
                linkText: document.getElementById('announcementLinkText').value,
                isActive: document.getElementById('announcementActive').checked
            };
            
            try {
                const url = currentEditingAnnouncement 
                    ? `${API_BASE}/announcements/${currentEditingAnnouncement}`
                    : `${API_BASE}/announcements`;
                
                const method = currentEditingAnnouncement ? 'PUT' : 'POST';
                
                const res = await fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (!res.ok) throw new Error('Failed to save announcement');
                
                alert('Announcement saved successfully');
                closeAnnouncementModal();
                loadAnnouncements();
            } catch (err) {
                console.error('Save error:', err);
                alert('Failed to save announcement');
            }
        });
    }

    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            try {
                await saveProduct(e);
            } catch (err) {
                console.error('Save product error:', err);
                alert(err.message);
            }
        });
    }

    const promoForm = document.getElementById('promoForm');
    if (promoForm) {
        promoForm.addEventListener('submit', async (e) => {
            try {
                await savePromo(e);
            } catch (err) {
                console.error('Save promo error:', err);
                alert(err.message);
            }
        });
    }
});

// ==================== WEBSITE CONTENT EDITOR ====================

// Edit Page Content
async function editPageContent(page) {
    currentEditingPage = page;
    
    try {
        const res = await fetch(`${API_BASE}/content/${page}`);
        let content = null;
        
        if (res.ok) {
            content = await res.json();
        }
        
        const editor = document.getElementById('contentEditor');
        const fieldsDiv = document.getElementById('contentFields');
        const titleEl = document.getElementById('editorPageTitle');
        
        if (!editor || !fieldsDiv || !titleEl) return;
        
        titleEl.textContent = `Edit ${page.charAt(0).toUpperCase() + page.slice(1)} Page`;
        fieldsDiv.innerHTML = '';
        
        // Generate form fields based on page
        const fields = getPageFields(page, content);
        
        fields.forEach(field => {
            const fieldDiv = document.createElement('div');
            fieldDiv.innerHTML = `
                <label class="block text-sm font-medium mb-1">${field.label}</label>
                ${field.type === 'textarea' 
                    ? `<textarea id="field_${field.key}" rows="4" class="w-full border rounded-lg p-2">${field.value || ''}</textarea>`
                    : `<input type="${field.type}" id="field_${field.key}" value="${field.value || ''}" class="w-full border rounded-lg p-2">`
                }
            `;
            fieldsDiv.appendChild(fieldDiv);
        });
        
        editor.style.display = 'block';
    } catch (err) {
        console.error('Edit content error:', err);
        alert('Failed to load page content');
    }
}

// Get Page Fields
function getPageFields(page, content) {
    const sections = content?.sections || new Map();
    
    const pageFields = {
        home: [
            { key: 'hero_title', label: 'Hero Title', type: 'text', value: sections.get?.('hero_title') || 'Welcome to Tech Turf' },
            { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'textarea', value: sections.get?.('hero_subtitle') || '' },
            { key: 'hero_button', label: 'Hero Button Text', type: 'text', value: sections.get?.('hero_button') || 'Shop Now' },
            { key: 'features_title', label: 'Features Section Title', type: 'text', value: sections.get?.('features_title') || 'Why Choose Us' }
        ],
        about: [
            { key: 'about_title', label: 'About Title', type: 'text', value: sections.get?.('about_title') || 'About Tech Turf' },
            { key: 'about_description', label: 'About Description', type: 'textarea', value: sections.get?.('about_description') || '' },
            { key: 'mission', label: 'Mission Statement', type: 'textarea', value: sections.get?.('mission') || '' },
            { key: 'vision', label: 'Vision Statement', type: 'textarea', value: sections.get?.('vision') || '' }
        ],
        contact: [
            { key: 'contact_title', label: 'Contact Title', type: 'text', value: sections.get?.('contact_title') || 'Contact Us' },
            { key: 'email', label: 'Contact Email', type: 'email', value: sections.get?.('email') || 'contact@techturf.com' },
            { key: 'phone', label: 'Contact Phone', type: 'text', value: sections.get?.('phone') || '' },
            { key: 'address', label: 'Address', type: 'textarea', value: sections.get?.('address') || '' }
        ],
        header: [
            { key: 'logo_text', label: 'Logo Text', type: 'text', value: sections.get?.('logo_text') || 'Tech Turf' },
            { key: 'tagline', label: 'Tagline', type: 'text', value: sections.get?.('tagline') || '' }
        ],
        footer: [
            { key: 'footer_text', label: 'Footer Text', type: 'text', value: sections.get?.('footer_text') || '© 2026 Tech Turf' },
            { key: 'twitter', label: 'Twitter URL', type: 'url', value: sections.get?.('twitter') || '' },
            { key: 'instagram', label: 'Instagram URL', type: 'url', value: sections.get?.('instagram') || '' }
        ]
    };
    
    return pageFields[page] || [];
}

// Save Page Content
async function savePageContent() {
    if (!currentEditingPage) return;
    
    try {
        const token = localStorage.getItem('tt_token') || localStorage.getItem('token');
        
        const fields = document.querySelectorAll('#contentFields input, #contentFields textarea');
        const sections = {};
        
        fields.forEach(field => {
            const key = field.id.replace('field_', '');
            sections[key] = field.value;
        });
        
        const res = await fetch(`${API_BASE}/content/${currentEditingPage}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sections })
        });
        
        if (!res.ok) throw new Error('Failed to save content');
        
        alert('Content saved successfully!');
        closeContentEditor();
    } catch (err) {
        console.error('Save content error:', err);
        alert('Failed to save content');
    }
}

// Close Content Editor
function closeContentEditor() {
    const editor = document.getElementById('contentEditor');
    if (editor) {
        editor.style.display = 'none';
    }
    currentEditingPage = null;
}

