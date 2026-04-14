// Enhanced Order Management Controller
import { getAllOrders, getMyOrders, getOrderById, createOrder, updateOrderStatus, deleteOrder } from './order-controller.js';

// Enhanced order with additional fields
export const getEnhancedOrders = async (req, res) => {
    try {
        const { status, payment_status, date_from, date_to, search } = req.query;
        let query = `
            SELECT o.*, u.name as userName, u.email as userEmail
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
        `;
        const params = [];
        const conditions = [];
        
        if (status) {
            conditions.push('o.status = ?');
            params.push(status);
        }
        
        if (payment_status) {
            conditions.push('o.payment_status = ?');
            params.push(payment_status);
        }
        
        if (date_from) {
            conditions.push('DATE(o.created_at) >= ?');
            params.push(date_from);
        }
        
        if (date_to) {
            conditions.push('DATE(o.created_at) <= ?');
            params.push(date_to);
        }
        
        if (search) {
            conditions.push('(o.id LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR o.tracking_number LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY o.created_at DESC';
        
        const orders = await req.db.all(query, params);
        
        // Parse items and add calculated fields
        const enhancedOrders = orders.map(order => {
            const items = JSON.parse(order.items || '[]');
            return {
                ...order,
                orderItems: items,
                totalItems: items.reduce((sum, item) => sum + (item.qty || item.quantity || 1), 0),
                isOverdue: order.status !== 'Delivered' && new Date(order.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            };
        });
        
        res.json(enhancedOrders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateEnhancedOrderStatus = async (req, res) => {
    const { status, payment_status, tracking_number, shipping_method, estimated_delivery, notes } = req.body;
    const orderId = req.params.id;
    
    try {
        // Get current order for history
        const currentOrder = await req.db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
        if (!currentOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Update order
        await req.db.run(`
            UPDATE orders SET 
                status=?, payment_status=?, tracking_number=?, shipping_method=?, 
                estimated_delivery=?, notes=?, updated_at=CURRENT_TIMESTAMP
            WHERE id=?
        `, [
            status || currentOrder.status,
            payment_status || currentOrder.payment_status,
            tracking_number || currentOrder.tracking_number,
            shipping_method || currentOrder.shipping_method,
            estimated_delivery || currentOrder.estimated_delivery,
            notes || currentOrder.notes,
            orderId
        ]);
        
        // Record order history
        await req.db.run(`
            INSERT INTO order_history (order_id, user_id, action, old_status, new_status, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            orderId,
            req.user.id,
            'status_update',
            currentOrder.status,
            status || currentOrder.status,
            notes || `Status updated to ${status || currentOrder.status}`
        ]);
        
        // Set actual delivery date if delivered
        if (status === 'Delivered' && currentOrder.status !== 'Delivered') {
            await req.db.run('UPDATE orders SET actual_delivery = CURRENT_DATE WHERE id = ?', [orderId]);
        }
        
        const updatedOrder = await req.db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const modifyOrderItems = async (req, res) => {
    const { items, reason } = req.body;
    const orderId = req.params.id;
    
    try {
        const currentOrder = await req.db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
        if (!currentOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Calculate new total
        const newTotal = items.reduce((sum, item) => sum + (item.price * (item.qty || item.quantity || 1)), 0);
        
        // Update order
        await req.db.run(`
            UPDATE orders SET items=?, totalPrice=?, updated_at=CURRENT_TIMESTAMP
            WHERE id=?
        `, [JSON.stringify(items), newTotal, orderId]);
        
        // Record history
        await req.db.run(`
            INSERT INTO order_history (order_id, user_id, action, notes)
            VALUES (?, ?, ?, ?)
        `, [orderId, req.user.id, 'items_modified', reason || 'Order items modified']);
        
        const updatedOrder = await req.db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getOrderHistory = async (req, res) => {
    try {
        const history = await req.db.all(`
            SELECT oh.*, u.name as user_name
            FROM order_history oh
            LEFT JOIN users u ON oh.user_id = u.id
            WHERE oh.order_id = ?
            ORDER BY oh.created_at DESC
        `, [req.params.id]);
        
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Bulk operations
export const bulkUpdateOrderStatus = async (req, res) => {
    const { orderIds, status, payment_status, notes } = req.body;
    
    try {
        const results = [];
        
        for (const orderId of orderIds) {
            const currentOrder = await req.db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
            if (!currentOrder) {
                results.push({ orderId, success: false, error: 'Order not found' });
                continue;
            }
            
            await req.db.run(`
                UPDATE orders SET status=?, payment_status=?, updated_at=CURRENT_TIMESTAMP
                WHERE id=?
            `, [status || currentOrder.status, payment_status || currentOrder.payment_status, orderId]);
            
            // Record history
            await req.db.run(`
                INSERT INTO order_history (order_id, user_id, action, old_status, new_status, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                orderId, req.user.id, 'bulk_status_update',
                currentOrder.status, status || currentOrder.status,
                notes || `Bulk status update to ${status || currentOrder.status}`
            ]);
            
            results.push({ orderId, success: true });
        }
        
        res.json({ message: 'Bulk update completed', results });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const exportOrders = async (req, res) => {
    try {
        const { format, status, date_from, date_to } = req.query;
        
        let query = `
            SELECT o.id, o.created_at, o.status, o.payment_status, o.totalPrice,
                   u.name as customer_name, u.email as customer_email,
                   o.tracking_number, o.shipping_method, o.notes
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
        `;
        const params = [];
        const conditions = [];
        
        if (status) {
            conditions.push('o.status = ?');
            params.push(status);
        }
        
        if (date_from) {
            conditions.push('DATE(o.created_at) >= ?');
            params.push(date_from);
        }
        
        if (date_to) {
            conditions.push('DATE(o.created_at) <= ?');
            params.push(date_to);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY o.created_at DESC';
        
        const orders = await req.db.all(query, params);
        
        if (format === 'csv') {
            const csv = [
                'Order ID,Date,Status,Payment Status,Total,Customer Name,Customer Email,Tracking Number,Shipping Method,Notes',
                ...orders.map(order => [
                    order.id,
                    new Date(order.created_at).toISOString(),
                    order.status,
                    order.payment_status,
                    order.totalPrice,
                    `"${order.customer_name || ''}"`,
                    `"${order.customer_email || ''}"`,
                    order.tracking_number || '',
                    order.shipping_method || '',
                    `"${order.notes || ''}"`
                ].join(','))
            ].join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csv);
        } else {
            res.json(orders);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Order analytics
export const getOrderAnalytics = async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        let dateCondition = 'created_at >= date("now", "-30 days")';
        
        if (period === '7d') dateCondition = 'created_at >= date("now", "-7 days")';
        if (period === '90d') dateCondition = 'created_at >= date("now", "-90 days")';
        if (period === '1y') dateCondition = 'created_at >= date("now", "-1 year")';
        
        const analytics = await req.db.all(`
            SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status = 'Delivered' THEN 1 END) as delivered_orders,
                COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_orders,
                COUNT(CASE WHEN status = 'Processing' THEN 1 END) as processing_orders,
                COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
                COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as unpaid_orders,
                SUM(totalPrice) as total_revenue,
                AVG(totalPrice) as avg_order_value
            FROM orders
            WHERE ${dateCondition}
        `);
        
        const statusBreakdown = await req.db.all(`
            SELECT status, COUNT(*) as count, SUM(totalPrice) as revenue
            FROM orders
            WHERE ${dateCondition}
            GROUP BY status
            ORDER BY count DESC
        `);
        
        const dailyRevenue = await req.db.all(`
            SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(totalPrice) as revenue
            FROM orders
            WHERE ${dateCondition}
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
        `);
        
        res.json({
            summary: analytics[0],
            statusBreakdown,
            dailyRevenue
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
