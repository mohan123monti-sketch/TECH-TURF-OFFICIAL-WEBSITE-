// Admin Integration Controller - Complete functionality for enhanced admin features
import fs from 'fs';
import path from 'path';

// Initialize enhanced database schema
export const initializeDatabase = async (req, res) => {
    try {
        const db = req.db;
        
        // Read and execute the enhanced schema
        const schemaPath = path.resolve(process.cwd(), 'backend/database/enhanced-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Split schema into individual statements
        const statements = schema.split(';').filter(stmt => stmt.trim());
        
        // Execute each statement
        for (const statement of statements) {
            if (statement.trim()) {
                await db.run(statement);
            }
        }
        
        res.json({ 
            message: 'Enhanced database schema initialized successfully',
            tablesCreated: statements.length
        });
    } catch (error) {
        console.error('Database initialization error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Test table existence
export const testTable = async (req, res) => {
    try {
        const db = req.db;
        const { tableName } = req.params;
        
        // Check if table exists and has data
        const result = await db.get(`SELECT COUNT(*) as count FROM ${tableName}`);
        
        res.json({
            table: tableName,
            exists: true,
            recordCount: result.count,
            status: 'accessible'
        });
    } catch (error) {
        res.status(404).json({ 
            table: req.params.tableName,
            exists: false,
            error: error.message 
        });
    }
};

// Get comprehensive admin dashboard data
export const getAdminDashboardData = async (req, res) => {
    try {
        const db = req.db;
        
        // Get all dashboard metrics in parallel
        const [
            orders,
            products,
            users,
            branches,
            userGroups,
            recentOrders,
            analytics
        ] = await Promise.all([
            // Orders data
            db.get(`
                SELECT 
                    COUNT(*) as total_orders,
                    SUM(totalPrice) as total_revenue,
                    COUNT(CASE WHEN status = 'Delivered' THEN 1 END) as delivered_orders,
                    COUNT(CASE WHEN status = 'Processing' THEN 1 END) as processing_orders,
                    COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_orders
                FROM orders
            `),
            
            // Products data
            db.get(`
                SELECT 
                    COUNT(*) as total_products,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_products,
                    COUNT(CASE WHEN stock < reorder_level THEN 1 END) as low_stock_products
                FROM products
            `),
            
            // Users data
            db.get(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN role = 'admin' OR role = 'superadmin' THEN 1 END) as admin_users
                FROM users
            `),
            
            // Branches data
            db.get(`
                SELECT 
                    COUNT(*) as total_branches,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_branches
                FROM branches
            `),
            
            // User groups data
            db.get(`
                SELECT 
                    COUNT(*) as total_groups,
                    SUM((SELECT COUNT(*) FROM user_group_memberships WHERE group_id = user_groups.id)) as total_members
                FROM user_groups
            `),
            
            // Recent orders
            db.all(`
                SELECT o.*, u.name as userName, u.email as userEmail
                FROM orders o
                LEFT JOIN users u ON o.userId = u.id
                ORDER BY o.created_at DESC
                LIMIT 5
            `),
            
            // Analytics summary
            db.get(`
                SELECT 
                    COUNT(*) as total_events,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(DISTINCT session_id) as unique_sessions
                FROM analytics_events
                WHERE created_at >= datetime('now', '-30 days')
            `)
        ]);
        
        // Format response
        const dashboardData = {
            orders: {
                total_orders: orders.total_orders || 0,
                total_revenue: orders.total_revenue || 0,
                delivered_orders: orders.delivered_orders || 0,
                processing_orders: orders.processing_orders || 0,
                pending_orders: orders.pending_orders || 0
            },
            products: {
                total_products: products.total_products || 0,
                active_products: products.active_products || 0,
                low_stock_products: products.low_stock_products || 0
            },
            users: {
                total_users: users.total_users || 0,
                admin_users: users.admin_users || 0
            },
            branches: {
                total_branches: branches.total_branches || 0,
                active_branches: branches.active_branches || 0
            },
            userGroups: {
                total_groups: userGroups.total_groups || 0,
                total_members: userGroups.total_members || 0
            },
            recentOrders: recentOrders || [],
            analytics: {
                total_events: analytics.total_events || 0,
                unique_users: analytics.unique_users || 0,
                unique_sessions: analytics.unique_sessions || 0
            }
        };
        
        res.json(dashboardData);
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get system status
export const getSystemStatus = async (req, res) => {
    try {
        const db = req.db;
        
        // Check database status
        const dbStatus = await db.get('SELECT 1').then(() => 'Connected').catch(() => 'Error');
        
        // Check enhanced features status
        const features = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM branches').then(() => 'Active').catch(() => 'Inactive'),
            db.get('SELECT COUNT(*) as count FROM user_groups').then(() => 'Active').catch(() => 'Inactive'),
            db.get('SELECT COUNT(*) as count FROM analytics_events').then(() => 'Active').catch(() => 'Inactive'),
            db.get('SELECT COUNT(*) as count FROM system_settings').then(() => 'Active').catch(() => 'Inactive')
        ]);
        
        res.json({
            database: dbStatus,
            features: {
                branches: features[0],
                userGroups: features[1],
                analytics: features[2],
                systemSettings: features[3]
            },
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: '2.0.0-enhanced'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create sample data for testing
export const createSampleData = async (req, res) => {
    try {
        const db = req.db;
        
        // Create sample branches
        await db.run(`
            INSERT OR IGNORE INTO branches (name, address, phone, email, manager_name, status) VALUES
            ('Main Branch', '123 Tech Street, Mumbai', '+91-9876543210', 'main@techturf.com', 'John Doe', 'active'),
            ('Branch 2', '456 Innovation Road, Bangalore', '+91-9876543211', 'branch2@techturf.com', 'Jane Smith', 'active'),
            ('Branch 3', '789 Digital Avenue, Delhi', '+91-9876543212', 'branch3@techturf.com', 'Mike Johnson', 'inactive')
        `);
        
        // Create sample analytics events
        const events = [];
        for (let i = 0; i < 100; i++) {
            events.push([
                ['page_view', Math.floor(Math.random() * 10) + 1, `session_${Math.floor(Math.random() * 50)}`, 'product', Math.floor(Math.random() * 20) + 1, `{"timestamp": "${new Date().toISOString()}"}`],
                ['user_action', Math.floor(Math.random() * 10) + 1, `session_${Math.floor(Math.random() * 50)}`, 'order', Math.floor(Math.random() * 15) + 1, `{"action": "view"}`],
                ['system_event', null, `session_${Math.floor(Math.random() * 50)}`, 'system', null, `{"event": "login"}`]
            ][Math.floor(Math.random() * 3)]);
        }
        
        for (const [eventType, userId, sessionId, resourceType, resourceId, metadata] of events) {
            await db.run(`
                INSERT INTO analytics_events (event_type, user_id, session_id, resource_type, resource_id, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [eventType, userId, sessionId, resourceType, resourceId, metadata]);
        }
        
        res.json({
            message: 'Sample data created successfully',
            branches: 3,
            analyticsEvents: 100
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get comprehensive system logs
export const getSystemLogs = async (req, res) => {
    try {
        const db = req.db;
        const { limit = 100, level = 'all' } = req.query;
        
        let query = 'SELECT * FROM access_logs';
        let params = [];
        
        if (level !== 'all') {
            query += ' WHERE success = ?';
            params.push(level === 'success' ? 1 : 0);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit));
        
        const logs = await db.all(query, params);
        
        res.json({
            logs,
            total: logs.length,
            filtered: level !== 'all'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
