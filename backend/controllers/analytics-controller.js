// Advanced Analytics Controller
export const getDashboardAnalytics = async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        let dateCondition = 'created_at >= date("now", "-30 days")';
        
        if (period === '7d') dateCondition = 'created_at >= date("now", "-7 days")';
        if (period === '90d') dateCondition = 'created_at >= date("now", "-90 days")';
        if (period === '1y') dateCondition = 'created_at >= date("now", "-1 year")';
        
        // Orders Analytics
        const ordersAnalytics = await req.db.get(`
            SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status = 'Delivered' THEN 1 END) as delivered_orders,
                COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_orders,
                COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
                SUM(totalPrice) as total_revenue,
                AVG(totalPrice) as avg_order_value
            FROM orders
            WHERE ${dateCondition}
        `);
        
        // Products Analytics
        const productsAnalytics = await req.db.get(`
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_products,
                COUNT(CASE WHEN stock <= reorder_level THEN 1 END) as low_stock_products,
                COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock_products,
                AVG(price) as avg_product_price
            FROM products
        `);
        
        // Users Analytics
        const usersAnalytics = await req.db.get(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN role = 'admin' OR role = 'superadmin' THEN 1 END) as admin_users,
                COUNT(CASE WHEN role != 'banned' THEN 1 END) as active_users,
                COUNT(CASE WHEN created_at >= date("now", "-7 days") THEN 1 END) as recently_active
            FROM users
        `);
        
        // Content Analytics
        const contentAnalytics = await req.db.get(`
            SELECT 
                COUNT(*) as total_posts,
                COUNT(CASE WHEN is_published = 1 THEN 1 END) as published_posts,
                COUNT(CASE WHEN category = 'announcement' THEN 1 END) as announcements
            FROM knowledge_base
        `);
        
        // Revenue Trend
        const revenueTrend = await req.db.all(`
            SELECT 
                DATE(created_at) as date,
                SUM(totalPrice) as revenue,
                COUNT(*) as orders
            FROM orders
            WHERE ${dateCondition}
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
        `);
        
        // Top Products
        const topProducts = await req.db.all(`
            SELECT 
                p.name,
                p.price,
                SUM(CASE WHEN o.status = 'Delivered' THEN 1 ELSE 0 END) as sales_count
            FROM products p
            LEFT JOIN (
                SELECT json_extract(items, '$[*].id') as product_ids, status
                FROM orders
                WHERE ${dateCondition}
            ) o ON json_extract(o.product_ids, '$') LIKE '%' || p.id || '%'
            GROUP BY p.id
            ORDER BY sales_count DESC
            LIMIT 10
        `);
        
        res.json({
            orders: ordersAnalytics,
            products: productsAnalytics,
            users: usersAnalytics,
            content: contentAnalytics,
            revenueTrend,
            topProducts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getSalesReport = async (req, res) => {
    try {
        const { period = '30d', group_by = 'day' } = req.query;
        let dateCondition = 'created_at >= date("now", "-30 days")';
        let dateFormat = '%Y-%m-%d';
        
        if (period === '7d') dateCondition = 'created_at >= date("now", "-7 days")';
        if (period === '90d') dateCondition = 'created_at >= date("now", "-90 days")';
        if (period === '1y') dateCondition = 'created_at >= date("now", "-1 year")';
        
        if (group_by === 'week') dateFormat = '%Y-%W';
        if (group_by === 'month') dateFormat = '%Y-%m';
        if (group_by === 'year') dateFormat = '%Y';
        
        const salesData = await req.db.all(`
            SELECT 
                strftime('${dateFormat}', created_at) as period,
                COUNT(*) as orders_count,
                SUM(totalPrice) as revenue,
                AVG(totalPrice) as avg_order_value,
                COUNT(CASE WHEN status = 'Delivered' THEN 1 END) as delivered_orders
            FROM orders
            WHERE ${dateCondition}
            GROUP BY strftime('${dateFormat}', created_at)
            ORDER BY period DESC
        `);
        
        const paymentBreakdown = await req.db.all(`
            SELECT 
                payment_status,
                COUNT(*) as count,
                SUM(totalPrice) as revenue
            FROM orders
            WHERE ${dateCondition}
            GROUP BY payment_status
        `);
        
        const statusBreakdown = await req.db.all(`
            SELECT 
                status,
                COUNT(*) as count,
                SUM(totalPrice) as revenue
            FROM orders
            WHERE ${dateCondition}
            GROUP BY status
        `);
        
        res.json({
            salesData,
            paymentBreakdown,
            statusBreakdown
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getInventoryReport = async (req, res) => {
    try {
        const inventoryData = await req.db.all(`
            SELECT 
                p.id,
                p.name,
                p.sku,
                p.category,
                p.price,
                p.stock,
                p.low_stock_threshold,
                p.status,
                (p.stock - p.low_stock_threshold) as stock_buffer,
                CASE 
                    WHEN p.stock = 0 THEN 'Out of Stock'
                    WHEN p.stock <= p.low_stock_threshold THEN 'Low Stock'
                    ELSE 'In Stock'
                END as stock_status
            FROM products p
            ORDER BY p.stock ASC
        `);
        
        const categoryBreakdown = await req.db.all(`
            SELECT 
                category,
                COUNT(*) as product_count,
                SUM(stock) as total_stock,
                COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock,
                COUNT(CASE WHEN stock <= low_stock_threshold THEN 1 END) as low_stock
            FROM products
            GROUP BY category
            ORDER BY total_stock DESC
        `);
        
        const stockAlerts = await req.db.all(`
            SELECT 
                p.name,
                p.sku,
                p.stock,
                p.low_stock_threshold,
                p.category
            FROM products p
            WHERE p.stock <= p.low_stock_threshold
            ORDER BY p.stock ASC
            LIMIT 20
        `);
        
        const valuation = await req.db.get(`
            SELECT 
                SUM(stock * price) as total_value,
                COUNT(*) as total_products,
                AVG(price) as avg_price
            FROM products
            WHERE status = 'active'
        `);
        
        res.json({
            inventoryData,
            categoryBreakdown,
            stockAlerts,
            valuation
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserActivityReport = async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        let dateCondition = 'created_at >= date("now", "-30 days")';
        
        if (period === '7d') dateCondition = 'created_at >= date("now", "-7 days")';
        if (period === '90d') dateCondition = 'created_at >= date("now", "-90 days")';
        
        const userActivity = await req.db.all(`
            SELECT 
                DATE(last_login) as date,
                COUNT(*) as active_users
            FROM users
            WHERE last_login IS NOT NULL AND ${dateCondition.replace('created_at', 'last_login')}
            GROUP BY DATE(last_login)
            ORDER BY date DESC
            LIMIT 30
        `);
        
        const newUsers = await req.db.all(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as new_users
            FROM users
            WHERE ${dateCondition}
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
        `);
        
        const roleDistribution = await req.db.all(`
            SELECT 
                role,
                COUNT(*) as count,
                COUNT(CASE WHEN last_login >= date("now", "-7 days") THEN 1 END) as active_this_week
            FROM users
            GROUP BY role
        `);
        
        const departmentStats = await req.db.all(`
            SELECT 
                department,
                COUNT(*) as count,
                COUNT(CASE WHEN last_login >= date("now", "-7 days") THEN 1 END) as active_this_week
            FROM users
            WHERE department IS NOT NULL AND department != ''
            GROUP BY department
            ORDER BY count DESC
        `);
        
        res.json({
            userActivity,
            newUsers,
            roleDistribution,
            departmentStats
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getFinancialReport = async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        let dateCondition = 'created_at >= date("now", "-30 days")';
        
        if (period === '7d') dateCondition = 'created_at >= date("now", "-7 days")';
        if (period === '90d') dateCondition = 'created_at >= date("now", "-90 days")';
        if (period === '1y') dateCondition = 'created_at >= date("now", "-1 year")';
        
        const revenueMetrics = await req.db.get(`
            SELECT 
                SUM(totalPrice) as total_revenue,
                COUNT(*) as total_orders,
                AVG(totalPrice) as avg_order_value,
                MAX(totalPrice) as highest_order,
                MIN(totalPrice) as lowest_order
            FROM orders
            WHERE ${dateCondition}
        `);
        
        const paymentMetrics = await req.db.all(`
            SELECT 
                payment_status,
                COUNT(*) as count,
                SUM(totalPrice) as revenue,
                ROUND((SUM(totalPrice) * 100.0 / (SELECT SUM(totalPrice) FROM orders WHERE ${dateCondition})), 2) as revenue_percentage
            FROM orders
            WHERE ${dateCondition}
            GROUP BY payment_status
        `);
        
        const monthlyRevenue = await req.db.all(`
            SELECT 
                strftime('%Y-%m', created_at) as month,
                SUM(totalPrice) as revenue,
                COUNT(*) as orders
            FROM orders
            WHERE created_at >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', created_at)
            ORDER BY month DESC
        `);
        
        const topCustomers = await req.db.all(`
            SELECT 
                u.name,
                u.email,
                COUNT(o.id) as order_count,
                SUM(o.totalPrice) as total_spent,
                AVG(o.totalPrice) as avg_order_value
            FROM users u
            JOIN orders o ON u.id = o.user_id
            WHERE ${dateCondition}
            GROUP BY u.id
            ORDER BY total_spent DESC
            LIMIT 10
        `);
        
        const profitAnalysis = await req.db.all(`
            SELECT 
                p.category,
                SUM(o.totalPrice) as revenue,
                COUNT(o.id) as orders,
                AVG(o.totalPrice) as avg_order_value
            FROM orders o
            JOIN (
                SELECT id, category FROM products
            ) p ON json_extract(o.items, '$[*].id') LIKE '%' || p.id || '%'
            WHERE ${dateCondition}
            GROUP BY p.category
            ORDER BY revenue DESC
        `);
        
        res.json({
            revenueMetrics,
            paymentMetrics,
            monthlyRevenue,
            topCustomers,
            profitAnalysis
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const trackEvent = async (req, res) => {
    const { event_type, properties, session_id } = req.body;
    
    try {
        await req.db.run(`
            INSERT INTO analytics_events (event_type, user_id, session_id, properties, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            event_type,
            req.user?.id || null,
            session_id || null,
            JSON.stringify(properties || {}),
            req.ip,
            req.get('User-Agent')
        ]);
        
        res.status(201).json({ message: 'Event tracked successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getEventAnalytics = async (req, res) => {
    try {
        const { event_type, period = '7d' } = req.query;
        let dateCondition = 'created_at >= date("now", "-7 days")';
        
        if (period === '1d') dateCondition = 'created_at >= date("now", "-1 day")';
        if (period === '30d') dateCondition = 'created_at >= date("now", "-30 days")';
        
        let query = `
            SELECT 
                event_type,
                COUNT(*) as event_count,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT session_id) as unique_sessions
            FROM analytics_events
            WHERE ${dateCondition}
        `;
        
        const params = [];
        if (event_type) {
            query += ' AND event_type = ?';
            params.push(event_type);
        }
        
        query += ' GROUP BY event_type ORDER BY event_count DESC';
        
        const events = await req.db.all(query, params);
        
        const hourlyActivity = await req.db.all(`
            SELECT 
                strftime('%H', created_at) as hour,
                COUNT(*) as events
            FROM analytics_events
            WHERE created_at >= date('now', '-1 day')
            GROUP BY strftime('%H', created_at)
            ORDER BY hour
        `);
        
        res.json({
            events,
            hourlyActivity
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
