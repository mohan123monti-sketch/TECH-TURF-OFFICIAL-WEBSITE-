const parseJSONSafe = (value, fallback) => {
    if (value == null) return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const mapStatusCounts = (rows, labels) => {
    const byStatus = new Map(rows.map((row) => [String(row.status || '').toLowerCase(), Number(row.count || 0)]));
    return labels.map((label) => byStatus.get(label.toLowerCase()) || 0);
};

// @desc    Get dashboard statistics
// @route   GET /api/stats/dashboard
export const getDashboardStats = async (req, res) => {
    const db = req.db;
    try {
        const totalUsers = (await db.get('SELECT COUNT(*) as count FROM users'))?.count || 0;
        const totalOrders = (await db.get('SELECT COUNT(*) as count FROM orders'))?.count || 0;
        const totalProducts = (await db.get('SELECT COUNT(*) as count FROM products'))?.count || 0;
        const revenue = (await db.get('SELECT SUM(totalPrice) as total FROM orders'))?.total || 0;
        const orderStatusRows = await db.all('SELECT status, COUNT(*) as count FROM orders GROUP BY status');
        const taskStatusRows = await db.all('SELECT status, COUNT(*) as count FROM tasks GROUP BY status');
        const projectStatusRows = await db.all('SELECT status, COUNT(*) as count FROM projects GROUP BY status');

        const stats = {
            totalUsers,
            activeUsers: totalUsers,
            totalEmployees: (await db.get('SELECT COUNT(*) as count FROM employees'))?.count || 0,
            totalClients: (await db.get('SELECT COUNT(*) as count FROM clients'))?.count || 0,
            totalProjects: (await db.get('SELECT COUNT(*) as count FROM projects'))?.count || 0,
            totalTasks: (await db.get('SELECT COUNT(*) as count FROM tasks'))?.count || 0,
            totalOrders,
            totalProducts,
            revenue,
            totalRevenue: revenue,
            revenueChange: 0,
            ordersChange: 0,
            usersChange: 0,
            orderValueChange: 0,
            revenueData: [0, 0, 0, 0, 0, 0, 0],
            revenueLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            ordersByStatus: mapStatusCounts(orderStatusRows, ['Pending', 'Processing', 'Shipped', 'Delivered']),
            customerSegments: [0, 0, 0, 0],
            tasksByStatus: taskStatusRows,
            projectsByStatus: projectStatusRows
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get top products for analytics
// @route   GET /api/stats/top-products
export const getTopProducts = async (req, res) => {
    const db = req.db;
    try {
        const limit = Math.max(1, Math.min(Number(req.query.limit) || 5, 20));
        const orders = await db.all('SELECT items FROM orders');
        const products = await db.all('SELECT id, name, price FROM products');

        const productMap = new Map(
            products.map((product) => [String(product.id), {
                name: product.name,
                sales: 0,
                revenue: 0,
                price: Number(product.price || 0)
            }])
        );

        for (const order of orders) {
            const items = parseJSONSafe(order.items, []);
            for (const item of items) {
                const itemKey = String(item.productId || item.product_id || item.id || item.name || '');
                if (!itemKey) continue;

                const quantity = Number(item.qty || item.quantity || 1);
                const unitPrice = Number(item.price || 0);

                if (!productMap.has(itemKey) && item.name) {
                    productMap.set(itemKey, {
                        name: item.name,
                        sales: 0,
                        revenue: 0,
                        price: unitPrice
                    });
                }

                const current = productMap.get(itemKey);
                if (!current) continue;

                current.sales += quantity;
                current.revenue += unitPrice * quantity;
            }
        }

        const topProducts = Array.from(productMap.values())
            .filter((product) => product.sales > 0)
            .sort((a, b) => b.sales - a.sales || b.revenue - a.revenue)
            .slice(0, limit);

        res.json({ products: topProducts });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
