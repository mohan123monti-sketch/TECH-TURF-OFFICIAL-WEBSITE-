
export const getAllOrders = async (req, res) => {
    try {
        const orders = await req.db.all(`
            SELECT o.*, u.name as userName, u.email as userEmail 
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC
        `);
        const parsedOrders = orders.map(o => ({
            ...o,
            items: JSON.parse(o.items || '[]')
        }));
        res.json(parsedOrders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getOrderById = async (req, res) => {
    try {
        const order = await req.db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        order.items = JSON.parse(order.items || '[]');
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createOrder = async (req, res) => {
    const { user_id, items, totalPrice, paymentMethod, shippingAddress } = req.body;
    try {
        const result = await req.db.run(
            'INSERT INTO orders (user_id, items, totalPrice, paymentMethod, shippingAddress) VALUES (?, ?, ?, ?, ?)',
            [user_id, JSON.stringify(items), totalPrice, paymentMethod, shippingAddress]
        );
        const newOrder = await req.db.get('SELECT * FROM orders WHERE id = ?', [result.lastID]);
        res.status(201).json(newOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateOrderStatus = async (req, res) => {
    const { status, isPaid, isDelivered } = req.body;
    try {
        await req.db.run(
            'UPDATE orders SET status=?, isPaid=?, isDelivered=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
            [status, isPaid ? 1 : 0, isDelivered ? 1 : 0, req.params.id]
        );
        const updatedOrder = await req.db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteOrder = async (req, res) => {
    try {
        await req.db.run('DELETE FROM orders WHERE id = ?', [req.params.id]);
        res.json({ message: 'Order deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
