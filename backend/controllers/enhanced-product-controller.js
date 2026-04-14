// Enhanced Product Management Controller
import { getAllProducts, createProduct, updateProduct, deleteProduct } from './product-controller.js';

// Enhanced product with additional fields
export const getEnhancedProducts = async (req, res) => {
    try {
        const { branch, status, category, search, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT p.*, 
                   GROUP_CONCAT(DISTINCT b.name) as branches,
                   COALESCE(SUM(pbi.stock_quantity), 0) as total_stock
            FROM products p
            LEFT JOIN product_branch_inventory pbi ON p.id = pbi.product_id
            LEFT JOIN branches b ON pbi.branch_id = b.id
        `;
        let countQuery = `
            SELECT COUNT(DISTINCT p.id) as total
            FROM products p
            LEFT JOIN product_branch_inventory pbi ON p.id = pbi.product_id
            LEFT JOIN branches b ON pbi.branch_id = b.id
        `;
        
        const params = [];
        const conditions = [];
        
        if (branch) {
            conditions.push('EXISTS (SELECT 1 FROM product_branch_inventory WHERE product_id = p.id AND branch_id = ?)');
            params.push(branch);
        }
        
        if (status) {
            conditions.push('p.status = ?');
            params.push(status);
        }
        
        if (category) {
            conditions.push('p.category = ?');
            params.push(category);
        }
        
        if (search) {
            conditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' GROUP BY p.id ORDER BY p.name LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        const [products, countResult] = await Promise.all([
            req.db.all(query, params),
            req.db.get(countQuery, params.slice(0, -2)) // Remove limit and offset for count
        ]);
        
        // Parse branches and add branch-specific inventory
        const enhancedProducts = products.map(product => ({
            ...product,
            branches: product.branches ? product.branches.split(',') : [],
            low_stock: product.total_stock <= (product.low_stock_threshold || 5)
        }));
        
        res.json({
            products: enhancedProducts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult.total,
                pages: Math.ceil(countResult.total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createEnhancedProduct = async (req, res) => {
    const { 
        name, description, price, stock, category, image_url, imageUrl,
        sku, weight, dimensions, tags, meta_title, meta_description, meta_keywords,
        low_stock_threshold, status, branch_id
    } = req.body;
    
    try {
        const result = await req.db.run(`
            INSERT INTO products (
                name, description, price, stock, category, image_url, sku, weight, dimensions,
                tags, meta_title, meta_description, meta_keywords, low_stock_threshold, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name, description, price, stock, category, image_url || imageUrl, sku, weight, dimensions,
            tags, meta_title, meta_description, meta_keywords, low_stock_threshold || 5, status || 'active'
        ]);
        
        const productId = result.lastID;
        
        // Create branch inventory if specified
        if (branch_id && stock > 0) {
            await req.db.run(`
                INSERT INTO product_branch_inventory (product_id, branch_id, stock, low_stock_threshold)
                VALUES (?, ?, ?, ?)
            `, [productId, branch_id, stock, low_stock_threshold || 5]);
        }
        
        const newProduct = await req.db.get('SELECT * FROM products WHERE id = ?', [productId]);
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateEnhancedProduct = async (req, res) => {
    const { 
        name, description, price, stock, category, image_url, imageUrl,
        sku, weight, dimensions, tags, meta_title, meta_description, meta_keywords,
        low_stock_threshold, status
    } = req.body;
    
    try {
        await req.db.run(`
            UPDATE products SET 
                name=?, description=?, price=?, stock=?, category=?, image_url=?, sku=?, weight=?, dimensions=?,
                tags=?, meta_title=?, meta_description=?, meta_keywords=?, low_stock_threshold=?, status=?,
                updated_at=CURRENT_TIMESTAMP
            WHERE id=?
        `, [
            name, description, price, stock, category, image_url || imageUrl, sku, weight, dimensions,
            tags, meta_title, meta_description, meta_keywords, low_stock_threshold || 5, status || 'active',
            req.params.id
        ]);
        
        const updatedProduct = await req.db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Bulk operations
export const bulkUpdateProducts = async (req, res) => {
    const { updates, action } = req.body; // updates: array of {id, field, value}
    
    try {
        const results = [];
        
        for (const update of updates) {
            const { id, field, value } = update;
            
            // Validate field
            const allowedFields = ['status', 'category', 'price', 'stock', 'low_stock_threshold'];
            if (!allowedFields.includes(field)) {
                results.push({ id, success: false, error: 'Invalid field' });
                continue;
            }
            
            await req.db.run(`UPDATE products SET ${field}=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [value, id]);
            results.push({ id, success: true });
        }
        
        res.json({ message: 'Bulk update completed', results });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const bulkDeleteProducts = async (req, res) => {
    const { productIds } = req.body;
    
    try {
        const placeholders = productIds.map(() => '?').join(',');
        await req.db.run(`DELETE FROM products WHERE id IN (${placeholders})`, productIds);
        res.json({ message: `Deleted ${productIds.length} products` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Product analytics
export const getProductAnalytics = async (req, res) => {
    try {
        const analytics = await req.db.all(`
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_products,
                COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_products,
                COUNT(CASE WHEN stock <= low_stock_threshold THEN 1 END) as low_stock_products,
                COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock_products,
                AVG(price) as avg_price,
                SUM(stock) as total_stock,
                COUNT(DISTINCT category) as total_categories
            FROM products
        `);
        
        const categoryBreakdown = await req.db.all(`
            SELECT category, COUNT(*) as count, AVG(price) as avg_price, SUM(stock) as total_stock
            FROM products
            GROUP BY category
            ORDER BY count DESC
        `);
        
        const stockAlerts = await req.db.all(`
            SELECT p.*, (p.stock - p.low_stock_threshold) as stock_difference
            FROM products p
            WHERE p.stock <= p.low_stock_threshold
            ORDER BY p.stock ASC
            LIMIT 10
        `);
        
        res.json({
            summary: analytics[0],
            categoryBreakdown,
            stockAlerts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
