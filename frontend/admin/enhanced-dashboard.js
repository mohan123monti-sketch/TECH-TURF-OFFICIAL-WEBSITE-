// Enhanced Dashboard JavaScript with Mini Charts
let miniCharts = {};
let dashboardData = {};

const apiBase = window.API_BASE_URL || window.__TECHTURF_API_BASE__ || 'http://localhost:5000/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeMiniCharts();
    loadDashboardData();
    setInterval(loadDashboardData, 60000); // Refresh every minute
});

// Initialize Mini Charts
function initializeMiniCharts() {
    // Mini Revenue Chart
    const revenueCtx = document.getElementById('mini-revenue-chart');
    if (revenueCtx) {
        miniCharts.revenue = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#9ca3af', font: { size: 10 } },
                        grid: { color: 'rgba(156, 163, 175, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#9ca3af', font: { size: 10 } },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Mini Order Status Chart
    const statusCtx = document.getElementById('mini-status-chart');
    if (statusCtx) {
        miniCharts.status = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#10b981', '#3b82f6', '#f59e0b', '#ef4444'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#9ca3af', font: { size: 10 }, padding: 10 }
                    }
                }
            }
        });
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;

    try {
        // Load comprehensive dashboard data
        const response = await fetch(`${apiBase}/admin/integration/dashboard-data`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            dashboardData = await response.json();
            updateDashboardStats();
            updateMiniCharts();
            renderRecentOrders(dashboardData.recentOrders || []);
        } else {
            // Fallback to enhanced analytics
            const analyticsResponse = await fetch(`${apiBase}/admin/analytics/dashboard?period=30d`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (analyticsResponse.ok) {
                dashboardData = await analyticsResponse.json();
                updateDashboardStats();
                updateMiniCharts();
            }
        }

        // Load recent orders if not already loaded
        if (!dashboardData.recentOrders) {
            await loadRecentOrders();
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Fallback to original stats loading
        loadStats();
        loadOrders();
    }
}

// Update Dashboard Stats
function updateDashboardStats() {
    if (!dashboardData) return;
    
    // Update KPI cards with real data
    const ordersData = dashboardData.orders || {};
    const productsData = dashboardData.products || {};
    const usersData = dashboardData.users || {};
    const branchesData = dashboardData.branches || {};
    const analyticsData = dashboardData.analytics || {};
    
    updateStatCard('total-orders', ordersData.total_orders || 0);
    updateStatCard('total-revenue', ordersData.total_revenue || 0);
    updateStatCard('total-users', usersData.total_users || 0);
    updateStatCard('total-products', productsData.total_products || 0);
    
    // Update trend indicators with calculated growth
    updateTrendIndicator('orders-trend', calculateGrowth(ordersData.delivered_orders, ordersData.total_orders));
    updateTrendIndicator('revenue-trend', calculateGrowth(ordersData.processing_orders, ordersData.total_orders));
    updateTrendIndicator('users-trend', calculateGrowth(usersData.recently_active, usersData.total_users));
    updateTrendIndicator('products-trend', calculateGrowth(productsData.active_products, productsData.total_products));
    
    // Update additional stats
    if (document.getElementById('low-stock-alert')) {
        document.getElementById('low-stock-alert').textContent = productsData.low_stock_products || 0;
    }
    
    if (document.getElementById('active-branches')) {
        document.getElementById('active-branches').textContent = branchesData.active_branches || 0;
    }
    
    if (document.getElementById('active-sessions')) {
        document.getElementById('active-sessions').textContent = analyticsData.unique_sessions || 0;
    }
}

// Calculate growth percentage
function calculateGrowth(current, total) {
    if (!total || total === 0) return 0;
    return ((current / total) * 100).toFixed(1);
}

// Update Mini Charts
function updateMiniCharts() {
    // Update Revenue Chart
    if (miniCharts.revenue && dashboardData.revenueTrend) {
        const trend = dashboardData.revenueTrend.slice(0, 7).reverse(); // Last 7 days
        miniCharts.revenue.data.labels = trend.map(item => formatDate(item.date));
        miniCharts.revenue.data.datasets[0].data = trend.map(item => item.revenue);
        miniCharts.revenue.update();
    }

    // Update Order Status Chart
    if (miniCharts.status && dashboardData.orders) {
        const statusData = [
            { label: 'Delivered', value: dashboardData.orders.delivered_orders },
            { label: 'Processing', value: dashboardData.orders.processing_orders },
            { label: 'Pending', value: dashboardData.orders.pending_orders },
            { label: 'Other', value: (dashboardData.orders.total_orders - dashboardData.orders.delivered_orders - dashboardData.orders.processing_orders - dashboardData.orders.pending_orders) }
        ];
        
        miniCharts.status.data.labels = statusData.map(item => item.label);
        miniCharts.status.data.datasets[0].data = statusData.map(item => item.value);
        miniCharts.status.update();
    }
}

// Load Recent Orders
async function loadRecentOrders() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;

    try {
        const response = await fetch(`${apiBase}/orders/enhanced?limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const orders = await response.json();
            renderRecentOrders(orders);
        }
    } catch (error) {
        console.error('Error loading recent orders:', error);
        // Fallback to original orders loading
        loadOrders();
    }
}

// Render Recent Orders
function renderRecentOrders(orders) {
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500">No recent orders found.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const items = order.orderItems || [];
        const totalItems = items.reduce((sum, item) => sum + (item.qty || item.quantity || 1), 0);
        
        return `
            <tr class="hover:bg-white/5 transition-colors">
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-gray-700 overflow-hidden">
                            <img src="/public/images/space-bg.png" class="w-full h-full object-cover">
                        </div>
                        <div>
                            <p class="font-medium text-white">#${String(order.id).padStart(6, '0')}</p>
                            <p class="text-xs text-gray-400">${new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                </td>
                <td class="p-4">
                    <p class="text-sm text-white">${order.userName || 'Guest'}</p>
                    <p class="text-xs text-gray-400">${order.userEmail || 'N/A'}</p>
                </td>
                <td class="p-4">
                    <p class="text-sm text-white">${totalItems} items</p>
                    <p class="text-xs text-gray-400">View details</p>
                </td>
                <td class="p-4">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(order.status)}">
                        ${order.status || 'Pending'}
                    </span>
                </td>
                <td class="p-4 text-right">
                    <p class="font-bold text-green-400">INR ${Number(order.totalPrice || 0).toFixed(2)}</p>
                </td>
            </tr>
        `;
    }).join('');
}

// Get Status Class
function getStatusClass(status) {
    const statusClasses = {
        'Delivered': 'bg-green-500/10 text-green-500',
        'Processing': 'bg-blue-500/10 text-blue-500',
        'Pending': 'bg-yellow-500/10 text-yellow-500',
        'Shipped': 'bg-purple-500/10 text-purple-500'
    };
    return statusClasses[status] || statusClasses['Pending'];
}

// Fallback Functions (Original Implementation)
async function loadStats() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;

    try {
        const response = await fetch(`${apiBase}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const orders = await response.json();
            document.getElementById('stat-orders').textContent = orders.length || 0;
        }

        const productsResponse = await fetch(`${apiBase}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (productsResponse.ok) {
            const products = await productsResponse.json();
            document.getElementById('stat-products').textContent = products.length || 0;
        }

        const usersResponse = await fetch(`${apiBase}/auth/team`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (usersResponse.ok) {
            const users = await usersResponse.json();
            document.getElementById('stat-users').textContent = users.length || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadOrders() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;

    try {
        const response = await fetch(`${apiBase}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const orders = await response.json();
            renderRecentOrders(orders.slice(0, 5));
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        const tbody = document.getElementById('orders-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500">Unable to load orders.</td></tr>';
        }
    }
}

// Utility Functions
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(0);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
