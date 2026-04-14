// Advanced Analytics Dashboard JavaScript
let charts = {};
let analyticsData = {};
let refreshInterval;

const apiBase = window.API_BASE_URL || window.__TECHTURF_API_BASE__ || 'http://localhost:5000/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    refreshAnalytics();
    startAutoRefresh();
});

// Initialize Charts
function initializeCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenue-chart');
    if (revenueCtx) {
        charts.revenue = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
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
                        ticks: { color: '#9ca3af' },
                        grid: { color: 'rgba(156, 163, 175, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#9ca3af' },
                        grid: { color: 'rgba(156, 163, 175, 0.1)' }
                    }
                }
            }
        });
    }

    // Order Status Chart
    const orderStatusCtx = document.getElementById('order-status-chart');
    if (orderStatusCtx) {
        charts.orderStatus = new Chart(orderStatusCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#9ca3af' }
                    }
                }
            }
        });
    }

    // Category Chart
    const categoryCtx = document.getElementById('category-chart');
    if (categoryCtx) {
        charts.category = new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue',
                    data: [],
                    backgroundColor: '#3b82f6'
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
                        ticks: { color: '#9ca3af' },
                        grid: { color: 'rgba(156, 163, 175, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#9ca3af' },
                        grid: { color: 'rgba(156, 163, 175, 0.1)' }
                    }
                }
            }
        });
    }

    // Activity Chart
    const activityCtx = document.getElementById('activity-chart');
    if (activityCtx) {
        charts.activity = new Chart(activityCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Active Users',
                    data: [],
                    backgroundColor: '#8b5cf6'
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
                        ticks: { color: '#9ca3af' },
                        grid: { color: 'rgba(156, 163, 175, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#9ca3af' },
                        grid: { color: 'rgba(156, 163, 175, 0.1)' }
                    }
                }
            }
        });
    }
}

// Refresh Analytics
async function refreshAnalytics() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;

    const period = document.getElementById('date-range')?.value || '30d';
    
    try {
        // Load dashboard analytics
        const dashboardResponse = await fetch(`${apiBase}/admin/analytics/dashboard?period=${period}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (dashboardResponse.ok) {
            analyticsData = await dashboardResponse.json();
            updateKPICards();
            updateCharts();
            updateLists();
        }

        // Load additional reports
        await Promise.all([
            loadSalesReport(period),
            loadUserActivityReport(period),
            loadFinancialReport(period)
        ]);

    } catch (error) {
        console.error('Error refreshing analytics:', error);
        window.showToast('Failed to refresh analytics', 'error');
    }
}

// Update KPI Cards
function updateKPICards() {
    const data = analyticsData;
    
    // Revenue
    const revenue = data.orders?.total_revenue || 0;
    document.getElementById('kpi-revenue').textContent = `INR ${formatNumber(revenue)}`;
    document.getElementById('revenue-change').textContent = '+12.5%'; // Calculate real change
    
    // Orders
    const orders = data.orders?.total_orders || 0;
    document.getElementById('kpi-orders').textContent = formatNumber(orders);
    document.getElementById('orders-change').textContent = '+8.3%';
    
    // Users
    const users = data.users?.total_users || 0;
    document.getElementById('kpi-users').textContent = formatNumber(users);
    document.getElementById('users-change').textContent = '+15.2%';
    
    // Conversion Rate
    const conversionRate = orders > 0 && users > 0 ? ((orders / users) * 100).toFixed(1) : 0;
    document.getElementById('kpi-conversion').textContent = `${conversionRate}%`;
    document.getElementById('conversion-change').textContent = '+2.1%';

    // Advanced Metrics
    const avgOrder = data.orders?.avg_order_value || 0;
    document.getElementById('metric-avg-order').textContent = `INR ${formatNumber(avgOrder)}`;
    
    const customerLTV = avgOrder * 3.5; // Estimate
    document.getElementById('metric-customer-ltv').textContent = `INR ${formatNumber(customerLTV)}`;
    
    const retentionRate = 78.5; // Estimate
    document.getElementById('metric-retention').textContent = `${retentionRate}%`;
    
    const churnRate = 100 - retentionRate;
    document.getElementById('metric-churn').textContent = `${churnRate}%`;
}

// Update Charts
function updateCharts() {
    // Revenue Trend
    if (charts.revenue && analyticsData.revenueTrend) {
        const trend = analyticsData.revenueTrend.slice(0, 30).reverse();
        charts.revenue.data.labels = trend.map(item => formatDate(item.date));
        charts.revenue.data.datasets[0].data = trend.map(item => item.revenue);
        charts.revenue.update();
    }

    // Order Status
    if (charts.orderStatus && analyticsData.orders) {
        const statusData = [
            { label: 'Delivered', value: analyticsData.orders.delivered_orders },
            { label: 'Processing', value: analyticsData.orders.processing_orders },
            { label: 'Pending', value: analyticsData.orders.pending_orders }
        ];
        
        charts.orderStatus.data.labels = statusData.map(item => item.label);
        charts.orderStatus.data.datasets[0].data = statusData.map(item => item.value);
        charts.orderStatus.update();
    }

    // Category Performance
    if (charts.category && analyticsData.topProducts) {
        const categories = {};
        analyticsData.topProducts.forEach(product => {
            const category = product.category || 'Other';
            categories[category] = (categories[category] || 0) + product.sales_count;
        });
        
        charts.category.data.labels = Object.keys(categories);
        charts.category.data.datasets[0].data = Object.values(categories);
        charts.category.update();
    }

    // User Activity
    if (charts.activity) {
        // Generate sample hourly data
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const activity = hours.map(() => Math.floor(Math.random() * 50) + 10);
        
        charts.activity.data.labels = hours.map(h => `${h}:00`);
        charts.activity.data.datasets[0].data = activity;
        charts.activity.update();
    }
}

// Update Lists
function updateLists() {
    // Top Products
    const topProductsList = document.getElementById('top-products-list');
    if (topProductsList && analyticsData.topProducts) {
        topProductsList.innerHTML = analyticsData.topProducts.slice(0, 5).map((product, index) => `
            <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-sm font-bold">
                        ${index + 1}
                    </div>
                    <div>
                        <p class="text-sm font-medium text-white">${product.name}</p>
                        <p class="text-xs text-gray-400">${product.sales_count || 0} sales</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm font-bold text-green-400">INR ${formatNumber(product.price || 0)}</p>
                </div>
            </div>
        `).join('');
    }

    // Recent Activity
    const recentActivityList = document.getElementById('recent-activity-list');
    if (recentActivityList) {
        const activities = [
            { type: 'order', text: 'New order #12345', time: '2 mins ago', icon: 'shopping-cart', color: 'blue' },
            { type: 'user', text: 'New user registration', time: '5 mins ago', icon: 'user-plus', color: 'green' },
            { type: 'product', text: 'Product "Widget A" updated', time: '15 mins ago', icon: 'package', color: 'purple' },
            { type: 'payment', text: 'Payment received', time: '1 hour ago', icon: 'credit-card', color: 'orange' }
        ];
        
        recentActivityList.innerHTML = activities.map(activity => `
            <div class="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div class="w-8 h-8 rounded-lg bg-${activity.color}-500/10 flex items-center justify-center">
                    <i data-lucide="${activity.icon}" class="w-4 h-4 text-${activity.color}-400"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm text-white">${activity.text}</p>
                    <p class="text-xs text-gray-400">${activity.time}</p>
                </div>
            </div>
        `).join('');
        
        if (window.lucide) lucide.createIcons();
    }

    // System Health
    const systemHealthList = document.getElementById('system-health-list');
    if (systemHealthList) {
        const healthMetrics = [
            { name: 'Server CPU', value: 45, status: 'good' },
            { name: 'Database', value: 67, status: 'good' },
            { name: 'Memory', value: 82, status: 'warning' },
            { name: 'Storage', value: 34, status: 'good' }
        ];
        
        systemHealthList.innerHTML = healthMetrics.map(metric => `
            <div class="p-3 bg-white/5 rounded-lg">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-white">${metric.name}</span>
                    <span class="text-xs text-${metric.status === 'good' ? 'green' : metric.status === 'warning' ? 'yellow' : 'red'}-400">
                        ${metric.value}%
                    </span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2">
                    <div class="bg-${metric.status === 'good' ? 'green' : metric.status === 'warning' ? 'yellow' : 'red'}-500 h-2 rounded-full" 
                         style="width: ${metric.value}%"></div>
                </div>
            </div>
        `).join('');
    }
}

// Load Sales Report
async function loadSalesReport(period) {
    const token = localStorage.getItem('tt_token');
    if (!token) return;

    try {
        const response = await fetch(`${apiBase}/admin/analytics/sales?period=${period}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const salesData = await response.json();
            // Process sales data for additional insights
            console.log('Sales data loaded:', salesData);
        }
    } catch (error) {
        console.error('Error loading sales report:', error);
    }
}

// Load User Activity Report
async function loadUserActivityReport(period) {
    const token = localStorage.getItem('tt_token');
    if (!token) return;

    try {
        const response = await fetch(`${apiBase}/admin/analytics/user-activity?period=${period}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const activityData = await response.json();
            // Process activity data
            console.log('User activity data loaded:', activityData);
        }
    } catch (error) {
        console.error('Error loading user activity report:', error);
    }
}

// Load Financial Report
async function loadFinancialReport(period) {
    const token = localStorage.getItem('tt_token');
    if (!token) return;

    try {
        const response = await fetch(`${apiBase}/admin/analytics/financial?period=${period}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const financialData = await response.json();
            // Process financial data
            console.log('Financial data loaded:', financialData);
        }
    } catch (error) {
        console.error('Error loading financial report:', error);
    }
}

// Update Revenue Chart
function updateRevenueChart() {
    const chartType = document.getElementById('revenue-chart-type')?.value || 'line';
    
    if (charts.revenue) {
        charts.revenue.config.type = chartType;
        if (chartType === 'area') {
            charts.revenue.config.type = 'line';
            charts.revenue.data.datasets[0].fill = true;
        } else {
            charts.revenue.data.datasets[0].fill = false;
        }
        charts.revenue.update();
    }
}

// Update Order Status Chart
function updateOrderStatusChart() {
    // Refresh order status data
    refreshAnalytics();
}

// Update Category Chart
function updateCategoryChart() {
    const metric = document.getElementById('category-metric')?.value || 'revenue';
    
    if (charts.category) {
        // Update chart based on selected metric
        refreshAnalytics();
    }
}

// Update Activity Chart
function updateActivityChart() {
    const period = document.getElementById('activity-period')?.value || 'hourly';
    
    if (charts.activity) {
        // Update chart based on selected period
        refreshAnalytics();
    }
}

// Export Functions
function exportReport() {
    document.getElementById('export-modal').classList.remove('hidden');
}

function closeExportModal() {
    document.getElementById('export-modal').classList.add('hidden');
}

async function generateExport() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;

    const exportType = document.getElementById('export-type')?.value || 'comprehensive';
    const exportFormat = document.getElementById('export-format')?.value || 'csv';
    const exportPeriod = document.getElementById('export-period')?.value || '30d';

    try {
        let url;
        switch (exportType) {
            case 'sales':
                url = `${apiBase}/admin/analytics/sales?period=${exportPeriod}&format=${exportFormat}`;
                break;
            case 'inventory':
                url = `${apiBase}/admin/analytics/inventory?format=${exportFormat}`;
                break;
            case 'users':
                url = `${apiBase}/admin/analytics/user-activity?period=${exportPeriod}&format=${exportFormat}`;
                break;
            case 'financial':
                url = `${apiBase}/admin/analytics/financial?period=${exportPeriod}&format=${exportFormat}`;
                break;
            default:
                url = `${apiBase}/admin/analytics/dashboard?period=${exportPeriod}&format=${exportFormat}`;
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to generate export');

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${exportType}-report-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        window.showToast('Report exported successfully', 'success');
        closeExportModal();
    } catch (error) {
        console.error('Error generating export:', error);
        window.showToast('Failed to generate export', 'error');
    }
}

// Auto Refresh
function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        refreshAnalytics();
    }, 60000); // Refresh every minute
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
