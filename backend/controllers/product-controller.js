
import fs from 'fs';
import path from 'path';

const normalizeImageUrl = (value) => {
    if (!value) return '';
    return String(value).trim().replace(/\\/g, '/');
};

const isLocalUploadUrl = (value) => {
    const normalized = normalizeImageUrl(value);
    return normalized.startsWith('/uploads/') || normalized.startsWith('uploads/');
};

const resolveUploadFilePath = (value) => {
    const normalized = normalizeImageUrl(value).replace(/^\//, '');
    return normalized ? path.resolve(process.cwd(), normalized) : '';
};

const serializeProduct = (product) => ({
    ...product,
    image_url: normalizeImageUrl(product.image_url),
    imageUrl: normalizeImageUrl(product.imageUrl || product.image_url)
});

export const getAllProducts = async (req, res) => {
    try {
        const products = await req.db.all('SELECT * FROM products ORDER BY created_at DESC');
        res.json(products.map(serializeProduct));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getProductById = async (req, res) => {
    try {
        const product = await req.db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(serializeProduct(product));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createProduct = async (req, res) => {
    const { name, description, price, stock, category, image_url, imageUrl } = req.body;
    const normalizedImageUrl = normalizeImageUrl(image_url || imageUrl);
    try {
        const result = await req.db.run(
            'INSERT INTO products (name, description, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description, price, stock, category, normalizedImageUrl]
        );
        const newProduct = await req.db.get('SELECT * FROM products WHERE id = ?', [result.lastID]);
        res.status(201).json(serializeProduct(newProduct));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProduct = async (req, res) => {
    const { name, description, price, stock, category, image_url, imageUrl, status } = req.body;
    const normalizedImageUrl = normalizeImageUrl(image_url || imageUrl);
    try {
        await req.db.run(
            'UPDATE products SET name=?, description=?, price=?, stock=?, category=?, image_url=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
            [name, description, price, stock, category, normalizedImageUrl, status, req.params.id]
        );
        const updatedProduct = await req.db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        res.json(serializeProduct(updatedProduct));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const product = await req.db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const imageUrl = normalizeImageUrl(product.image_url);
        if (isLocalUploadUrl(imageUrl)) {
            const filePath = resolveUploadFilePath(imageUrl);
            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            await req.db.run(
                `DELETE FROM media
                 WHERE REPLACE(filepath, '\\', '/') = ?
                    OR REPLACE(filepath, '\\', '/') = ?
                    OR REPLACE(filepath, '\\', '/') = ?`,
                [
                    imageUrl.replace(/^\//, ''),
                    imageUrl,
                    filePath.replace(/\\/g, '/')
                ]
            );
        }

        await req.db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
