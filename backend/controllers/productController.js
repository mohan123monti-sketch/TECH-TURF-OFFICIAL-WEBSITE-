
export const getAllProducts = async (req, res) => {
    try {
        const products = await req.db.all('SELECT * FROM products ORDER BY created_at DESC');
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getProductById = async (req, res) => {
    try {
        const product = await req.db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createProduct = async (req, res) => {
    const { name, description, price, stock, category, image_url } = req.body;
    try {
        const result = await req.db.run(
            'INSERT INTO products (name, description, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description, price, stock, category, image_url]
        );
        const newProduct = await req.db.get('SELECT * FROM products WHERE id = ?', [result.lastID]);
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProduct = async (req, res) => {
    const { name, description, price, stock, category, image_url, status } = req.body;
    try {
        await req.db.run(
            'UPDATE products SET name=?, description=?, price=?, stock=?, category=?, image_url=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
            [name, description, price, stock, category, image_url, status, req.params.id]
        );
        const updatedProduct = await req.db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        await req.db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
