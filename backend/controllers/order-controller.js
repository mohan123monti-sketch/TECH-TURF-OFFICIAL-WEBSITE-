const parseJSONSafe = (value, fallback) => {
    if (value == null) return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const normalizeOrder = (order) => {
    const items = parseJSONSafe(order.items, []);
    const shippingAddress = parseJSONSafe(order.shippingAddress, {});
    const normalized = {
        ...order,
        items,
        orderItems: items,
        shippingAddress,
        _id: String(order.id),
        createdAt: order.created_at,
        updatedAt: order.updated_at
    };
    return normalized;
};

export const getAllOrders = async (req, res) => {
    try {
        const orders = await req.db.all(`
            SELECT o.*, u.name as userName, u.email as userEmail 
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC
        `);
        res.json(orders.map(normalizeOrder));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyOrders = async (req, res) => {
    try {
        const orders = await req.db.all(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(orders.map(normalizeOrder));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getOrderById = async (req, res) => {
    try {
        const order = await req.db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin' && String(order.user_id) !== String(req.user?.id)) {
            return res.status(403).json({ message: 'Not authorized to view this order' });
        }

        res.json(normalizeOrder(order));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createOrder = async (req, res) => {
    const body = req.body || {};
    const user_id = body.user_id || (req.user && req.user.id) || null;
    const items = body.items || body.orderItems || [];
    const totalPrice = Number(body.totalPrice ?? body.total_price ?? 0);
    const paymentMethod = body.paymentMethod || body.payment_method || 'COD';
    const shippingAddress = body.shippingAddress || body.shipping_address || {};
    const itemsPrice = Number(body.itemsPrice ?? body.items_price ?? 0);
    const taxPrice = Number(body.taxPrice ?? body.tax_price ?? 0);
    const shippingPrice = Number(body.shippingPrice ?? body.shipping_price ?? 0);
    const promoCode = body.promoCode || body.promo_code || '';
    const discountAmount = Number(body.discountAmount ?? body.discount_amount ?? 0);
    const deliverySlot = body.deliverySlot || body.delivery_slot || '';
    const orderNotes = body.orderNotes || body.order_notes || '';
    const giftMessage = body.giftMessage || body.gift_message || '';

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Order items are required' });
    }
    if (!totalPrice || Number.isNaN(totalPrice)) {
        return res.status(400).json({ message: 'Valid totalPrice is required' });
    }

    try {
        const result = await req.db.run(
            `INSERT INTO orders (
                user_id, items, totalPrice, paymentMethod, shippingAddress,
                itemsPrice, taxPrice, shippingPrice, promoCode, discountAmount,
                deliverySlot, orderNotes, giftMessage
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id,
                JSON.stringify(items),
                totalPrice,
                paymentMethod,
                JSON.stringify(shippingAddress),
                itemsPrice,
                taxPrice,
                shippingPrice,
                promoCode,
                discountAmount,
                deliverySlot,
                orderNotes,
                giftMessage
            ]
        );
        const newOrder = await req.db.get('SELECT * FROM orders WHERE id = ?', [result.lastID]);
        res.status(201).json(normalizeOrder(newOrder));
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
        res.json(normalizeOrder(updatedOrder));
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
