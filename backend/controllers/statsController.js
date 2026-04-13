// @desc    Get dashboard statistics
// @route   GET /api/stats/dashboard
export const getDashboardStats = async (req, res) => {
    const db = req.db;
    try {
        const stats = {
            totalUsers: (await db.get('SELECT COUNT(*) as count FROM users')).count,
            totalEmployees: (await db.get('SELECT COUNT(*) as count FROM employees')).count,
            totalClients: (await db.get('SELECT COUNT(*) as count FROM clients')).count,
            totalProjects: (await db.get('SELECT COUNT(*) as count FROM projects')).count,
            totalTasks: (await db.get('SELECT COUNT(*) as count FROM tasks')).count,
            totalOrders: (await db.get('SELECT COUNT(*) as count FROM orders'))?.count || 0,
            totalProducts: (await db.get('SELECT COUNT(*) as count FROM products'))?.count || 0,
            revenue: (await db.get('SELECT SUM(totalPrice) as total FROM orders'))?.total || 0,
            tasksByStatus: await db.all('SELECT status, COUNT(*) as count FROM tasks GROUP BY status'),
            projectsByStatus: await db.all('SELECT status, COUNT(*) as count FROM projects GROUP BY status')
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
