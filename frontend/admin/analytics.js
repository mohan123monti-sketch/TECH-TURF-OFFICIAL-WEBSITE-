let revenueChart, ordersChart, segmentsChart;

async function loadAnalytics() {
    const token = window.getAuthToken?.();
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Fetch dashboard stats
        const response = await fetch(`${window.API_BASE_URL || '/api'}/stats/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch analytics');

        const data = await response.json();

        // Update KPI Cards
        updateKPICards(data);

        // Initialize Charts
        initCharts(data);

        // Load top products
        loadTopProducts();

        // Load recent orders
        loadRecentOrders();

    } catch (error) {
        console.error('Error loading analytics:', error);
        window.showMessage?.('error', 'Failed to load analytics data');
    }
}

function updateKPICards(data) {
    // Total Revenue
    const totalRevenue = data.totalRevenue || 0;
    document.getElementById('total-revenue').textContent = `₹${totalRevenue.toFixed(2)}`;
    document.getElementById('revenue-change').textContent = `+${data.revenueChange || 0}% from last period`;

    // Total Orders
    const totalOrders = data.totalOrders || 0;
    document.getElementById('total-orders').textContent = totalOrders;
    document.getElementById('orders-change').textContent = `+${data.ordersChange || 0}% from last period`;

    // Active Users
    const activeUsers = data.activeUsers || 0;
    document.getElementById('active-users').textContent = activeUsers;
    document.getElementById('users-change').textContent = `+${data.usersChange || 0}% from last period`;

    // Average Order Value
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    document.getElementById('avg-order').textContent = `₹${avgOrder.toFixed(2)}`;
    document.getElementById('order-change').textContent = `+${data.orderValueChange || 0}% from last period`;
}

function initCharts(data) {
    const ctx1 = document.getElementById('revenue-chart')?.getContext('2d');
    const ctx2 = document.getElementById('orders-chart')?.getContext('2d');
    const ctx3 = document.getElementById('segments-chart')?.getContext('2d');

    if (!ctx1 || !ctx2 || !ctx3) return;

    // Revenue Trend Chart
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: data.revenueLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Revenue (₹)',
                data: data.revenueData || [0, 0, 0, 0, 0, 0, 0],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#10b981',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#9ca3af' }
                }
            },
            scales: {
                y: {
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    beginAtZero: true
                },
                x: {
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            }
        }
    });

    // Orders by Status Chart
    if (ordersChart) ordersChart.destroy();
    ordersChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Pending', 'Processing', 'Shipped', 'Delivered'],
            datasets: [{
                label: 'Orders',
                data: data.ordersByStatus || [0, 0, 0, 0],
                backgroundColor: [
                    'rgba(241, 196, 15, 0.7)',
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(155, 89, 182, 0.7)',
                    'rgba(46, 204, 113, 0.7)'
                ],
                borderColor: [
                    '#f1c40f',
                    '#3498db',
                    '#9b59b6',
                    '#2ecc71'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#9ca3af' } }
            },
            scales: {
                y: {
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    beginAtZero: true
                },
                x: {
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            }
        }
    });

    // Customer Segments Pie Chart
    if (segmentsChart) segmentsChart.destroy();
    segmentsChart = new Chart(ctx3, {
        type: 'doughnut',
        data: {
            labels: ['New Users', 'Returning', 'VIP', 'Inactive'],
            datasets: [{
                data: data.customerSegments || [0, 0, 0, 0],
                backgroundColor: [
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(46, 204, 113, 0.7)',
                    'rgba(230, 126, 34, 0.7)',
                    'rgba(149, 165, 166, 0.7)'
                ],
                borderColor: [
                    '#3498db',
                    '#2ecc71',
                    '#e67e22',
                    '#95a5a6'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#9ca3af' } }
            }
        }
    });
}

async function loadTopProducts() {
    const token = window.getAuthToken?.();
    if (!token) return;

    try {
        const response = await fetch(`${window.API_BASE_URL || '/api'}/stats/top-products?limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const { products } = await response.json();
        const container = document.getElementById('top-products');
        container.innerHTML = (products || []).slice(0, 5).map((product, i) => `
            <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
                <div class="flex-1">
                    <p class="font-semibold text-white text-sm">${i + 1}. ${product.name || 'Unknown'}</p>
                    <p class="text-gray-400 text-xs">${product.sales || 0} sales</p>
                </div>
                <p class="text-green-400 font-bold">₹${(product.revenue || 0).toFixed(0)}</p>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading top products:', error);
    }
}

async function loadRecentOrders() {
    const token = window.getAuthToken?.();
    if (!token) return;

    try {
        const response = await fetch(`${window.API_BASE_URL || '/api'}/orders?limit=5&sort=-createdAt`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const { orders } = await response.json();
        const container = document.getElementById('recent-orders');
        container.innerHTML = (orders || []).slice(0, 5).map(order => {
            const statusColors = {
                pending: 'text-yellow-400 bg-yellow-500/10',
                processing: 'text-blue-400 bg-blue-500/10',
                shipped: 'text-purple-400 bg-purple-500/10',
                delivered: 'text-green-400 bg-green-500/10'
            };
            const statusClass = statusColors[order.orderStatus?.toLowerCase()] || 'text-gray-400 bg-gray-500/10';

            return `
                <div class="p-3 bg-white/5 rounded-lg">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <p class="font-semibold text-white text-sm">Order #${order._id?.substring(0, 8) || 'N/A'}</p>
                            <p class="text-gray-400 text-xs">Customer: ${order.shippingAddress?.name || 'N/A'}</p>
                        </div>
                        <span class="text-xs px-2 py-1 rounded ${statusClass}">
                            ${order.orderStatus || 'Unknown'}
                        </span>
                    </div>
                    <p class="text-green-400 font-bold text-sm">₹${(order.totalPrice || 0).toFixed(2)}</p>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading recent orders:', error);
    }
}

function updateAnalytics() {
    // Reload analytics based on selected date range
    loadAnalytics();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    loadAnalytics();

    // Refresh analytics every 30 seconds
    setInterval(loadAnalytics, 30000);
});
