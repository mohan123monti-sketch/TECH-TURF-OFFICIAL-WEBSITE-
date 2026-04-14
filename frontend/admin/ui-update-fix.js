// UI Update Fix Script - Force refresh admin panel with enhanced features
(function() {
    console.log('Applying UI update fixes...');
    
    // Force clear cache and reload
    function forceRefresh() {
        // Clear all caches
        if ('caches' in window) {
            caches.keys().then(function(names) {
                names.forEach(function(name) {
                    caches.delete(name);
                });
            });
        }
        
        // Clear localStorage (except auth token)
        const token = localStorage.getItem('tt_token');
        localStorage.clear();
        if (token) localStorage.setItem('tt_token', token);
        
        // Force reload
        window.location.reload(true);
    }
    
    // Check if enhanced features are loaded
    function checkEnhancedFeatures() {
        const sidebar = document.getElementById('sidebar-container');
        if (!sidebar) return false;
        
        const sidebarHTML = sidebar.innerHTML;
        const enhancedItems = [
            'Advanced Analytics',
            'Enhanced Products',
            'Branch Management',
            'User Groups',
            'Reports',
            'System Settings'
        ];
        
        let foundCount = 0;
        enhancedItems.forEach(item => {
            if (sidebarHTML.includes(item)) foundCount++;
        });
        
        console.log(`Found ${foundCount}/${enhancedItems.length} enhanced menu items`);
        return foundCount >= enhancedItems.length * 0.8; // At least 80% found
    }
    
    // Fix dashboard enhancements
    function fixDashboard() {
        // Check if mini charts exist
        if (!document.getElementById('mini-revenue-chart')) {
            console.log('Adding mini charts to dashboard...');
            
            // Find the dashboard content area
            const dashboardContent = document.getElementById('dashboard-content');
            if (dashboardContent) {
                // Add mini charts section
                const chartsSection = document.createElement('div');
                chartsSection.className = 'grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8';
                chartsSection.innerHTML = `
                    <!-- Revenue Trend Mini Chart -->
                    <div class="iphone-glass rounded-[2rem] p-6 border border-white/5">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-black text-white">Revenue Trend</h3>
                            <a href="advanced-analytics.html" class="text-blue-400 hover:text-blue-300 text-sm">View Details</a>
                        </div>
                        <div class="h-48">
                            <canvas id="mini-revenue-chart"></canvas>
                        </div>
                    </div>
                    
                    <!-- Order Status Mini Chart -->
                    <div class="iphone-glass rounded-[2rem] p-6 border border-white/5">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-black text-white">Order Status</h3>
                            <a href="orders.html" class="text-blue-400 hover:text-blue-300 text-sm">Manage Orders</a>
                        </div>
                        <div class="h-48">
                            <canvas id="mini-status-chart"></canvas>
                        </div>
                    </div>
                `;
                
                // Insert after the stats cards
                const statsCards = dashboardContent.querySelector('.grid');
                if (statsCards && statsCards.nextSibling) {
                    dashboardContent.insertBefore(chartsSection, statsCards.nextSibling.nextSibling);
                } else {
                    dashboardContent.appendChild(chartsSection);
                }
            }
        }
        
        // Update stats cards with enhanced info
        const statCards = document.querySelectorAll('[id^="stat-"]');
        statCards.forEach(card => {
            const parent = card.parentElement;
            if (parent && !parent.innerHTML.includes('vs last')) {
                // Add trend indicators
                const trendSpan = document.createElement('span');
                trendSpan.className = 'text-green-400';
                trendSpan.textContent = '+12.5% vs last month';
                parent.appendChild(trendSpan);
            }
        });
    }
    
    // Initialize Chart.js mini charts
    function initializeMiniCharts() {
        if (typeof Chart === 'undefined') {
            console.log('Chart.js not loaded, loading...');
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = function() {
                setTimeout(createMiniCharts, 100);
            };
            document.head.appendChild(script);
        } else {
            createMiniCharts();
        }
    }
    
    function createMiniCharts() {
        // Revenue Chart
        const revenueCtx = document.getElementById('mini-revenue-chart');
        if (revenueCtx && !revenueCtx.chart) {
            revenueCtx.chart = new Chart(revenueCtx, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Revenue',
                        data: [12000, 19000, 15000, 25000, 22000, 30000, 28000],
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
        
        // Status Chart
        const statusCtx = document.getElementById('mini-status-chart');
        if (statusCtx && !statusCtx.chart) {
            statusCtx.chart = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Delivered', 'Processing', 'Pending'],
                    datasets: [{
                        data: [45, 30, 25],
                        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b']
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
    
    // Main execution
    setTimeout(function() {
        console.log('Checking admin panel UI state...');
        
        if (!checkEnhancedFeatures()) {
            console.log('Enhanced features not detected, applying fixes...');
            
            // Try to reload admin layout
            const script = document.createElement('script');
            script.src = 'admin-layout.js?t=' + Date.now();
            script.onload = function() {
                setTimeout(function() {
                    if (!checkEnhancedFeatures()) {
                        console.log('Still not working, forcing refresh...');
                        forceRefresh();
                    } else {
                        console.log('Enhanced features loaded!');
                        fixDashboard();
                        initializeMiniCharts();
                    }
                }, 1000);
            };
            document.head.appendChild(script);
        } else {
            console.log('Enhanced features detected, fixing dashboard...');
            fixDashboard();
            initializeMiniCharts();
        }
    }, 2000);
    
    // Make functions globally available
    window.forceRefresh = forceRefresh;
    window.checkEnhancedFeatures = checkEnhancedFeatures;
})();
