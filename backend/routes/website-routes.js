
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../controllers/product-controller.js';
import { getAllOrders, getMyOrders, getOrderById, createOrder, updateOrderStatus, deleteOrder } from '../controllers/order-controller.js';
import { getAllPromos, createPromo, updatePromo, deletePromo, validatePromo } from '../controllers/promo-controller.js';
import { getAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../controllers/announcement-controller.js';
import { protect, adminOnly } from '../middleware/auth-middleware.js';

const router = express.Router();

const resolveFrontendRoot = () => {
    const direct = path.resolve(process.cwd(), 'frontend');
    if (fs.existsSync(direct)) return direct;

    const sibling = path.resolve(process.cwd(), '..', 'frontend');
    if (fs.existsSync(sibling)) return sibling;

    return direct;
};

const FRONTEND_ROOT = resolveFrontendRoot();
const EDITABLE_PATHS = ['pages', '_headers'];
const ROOT_HTML_ALLOWLIST = ['index.html', 'aadil-portfolio.html'];

const parseJSONSafe = (value, fallback) => {
    if (value == null) return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const toForwardSlash = (value) => String(value || '').replace(/\\/g, '/');

const getRelativePath = (absolutePath) => {
    const relative = path.relative(FRONTEND_ROOT, absolutePath);
    return toForwardSlash(relative);
};

const listHtmlFilesRecursive = (dirPath) => {
    const files = [];
    if (!fs.existsSync(dirPath)) return files;

    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        const absolute = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...listHtmlFilesRecursive(absolute));
            continue;
        }

        if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
            files.push(absolute);
        }
    }

    return files;
};

const listEditableWebsitePages = () => {
    const pageEntries = [];

    for (const relativePath of EDITABLE_PATHS) {
        const absoluteEntry = path.join(FRONTEND_ROOT, relativePath);
        if (!fs.existsSync(absoluteEntry)) continue;

        const stat = fs.statSync(absoluteEntry);
        if (stat.isDirectory()) {
            const htmlFiles = listHtmlFilesRecursive(absoluteEntry);
            for (const absolutePath of htmlFiles) {
                pageEntries.push(absolutePath);
            }
            continue;
        }

        if (stat.isFile()) {
            const name = path.basename(absoluteEntry).toLowerCase();
            if (name.endsWith('.html') || name === '_headers') {
                pageEntries.push(absoluteEntry);
            }
        }
    }

    for (const rootFileName of ROOT_HTML_ALLOWLIST) {
        const absolutePath = path.join(FRONTEND_ROOT, rootFileName);
        if (fs.existsSync(absolutePath)) {
            pageEntries.push(absolutePath);
        }
    }

    const unique = Array.from(new Set(pageEntries.map((filePath) => path.resolve(filePath))));

    return unique
        .map((absolutePath) => {
            const stat = fs.statSync(absolutePath);
            const relativePath = getRelativePath(absolutePath);
            return {
                path: relativePath,
                name: path.basename(relativePath),
                directory: path.dirname(relativePath) === '.' ? '' : path.dirname(relativePath),
                size: stat.size,
                updatedAt: stat.mtime.toISOString()
            };
        })
        .sort((a, b) => a.path.localeCompare(b.path));
};

const resolveEditablePagePath = (requestedPath) => {
    const normalizedInput = toForwardSlash(String(requestedPath || '').trim()).replace(/^\/+/, '');
    if (!normalizedInput || normalizedInput.includes('..')) return null;

    const editablePages = listEditableWebsitePages();
    const matched = editablePages.find((page) => page.path === normalizedInput);
    if (!matched) return null;

    const absolutePath = path.resolve(FRONTEND_ROOT, normalizedInput);
    if (!absolutePath.startsWith(FRONTEND_ROOT)) return null;
    return { absolutePath, relativePath: normalizedInput };
};

const normalizeUploadUrl = (filepath) => {
    if (!filepath) return '';
    const normalized = String(filepath).replace(/\\/g, '/');
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

const normalizeImageUrl = (value) => {
    if (!value) return '';
    return String(value).trim().replace(/\\/g, '/');
};

const isLocalUploadUrl = (value) => {
    const normalized = normalizeImageUrl(value);
    return normalized.startsWith('/uploads/') || normalized.startsWith('uploads/');
};

const resolveLocalUploadPath = (value) => {
    const normalized = normalizeImageUrl(value).replace(/^\//, '');
    return normalized ? path.resolve(process.cwd(), normalized) : '';
};

const resolveMediaFilePath = (filepath) => {
    if (!filepath) return '';
    const normalized = String(filepath).replace(/\\/g, '/').replace(/^\//, '');
    return normalized ? path.resolve(process.cwd(), normalized) : '';
};

// Multer Config for Media
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/media';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Products
router.get('/products', getAllProducts);
router.post('/products', protect, createProduct);
router.put('/products/:id', protect, updateProduct);
router.delete('/products/:id', protect, deleteProduct);

// Orders
router.get('/orders', protect, adminOnly, getAllOrders);
router.get('/orders/myorders', protect, getMyOrders);
router.get('/orders/:id', protect, getOrderById);
router.post('/orders', protect, createOrder);
router.put('/orders/:id/status', protect, adminOnly, updateOrderStatus);
router.delete('/orders/:id', protect, adminOnly, deleteOrder);

// Promos
router.get('/promos', getAllPromos);
router.post('/promos', protect, adminOnly, createPromo);
router.put('/promos/:id', protect, adminOnly, updatePromo);
router.delete('/promos/:id', protect, adminOnly, deletePromo);
router.post('/promos/validate', validatePromo);

// Announcements
router.get('/announcements', getAllAnnouncements);
router.post('/announcements', protect, adminOnly, createAnnouncement);
router.put('/announcements/:id', protect, adminOnly, updateAnnouncement);
router.delete('/announcements/:id', protect, adminOnly, deleteAnnouncement);

// Media
router.get('/media', protect, async (req, res) => {
    try {
        const media = await req.db.all('SELECT * FROM media ORDER BY created_at DESC');
        res.json(media);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/media/upload', protect, upload.single('file'), async (req, res) => {
    try {
        const { filename, path: filepath, mimetype, size } = req.file;
        const normalizedUrl = normalizeUploadUrl(filepath);
        const result = await req.db.run(
            'INSERT INTO media (filename, filepath, mimetype, size) VALUES (?, ?, ?, ?)',
            [filename, filepath, mimetype, size]
        );
        res.status(201).json({ id: result.lastID, filename, url: normalizedUrl, filepath: normalizedUrl, imageUrl: normalizedUrl });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/media/:id', protect, async (req, res) => {
    try {
        const item = await req.db.get('SELECT * FROM media WHERE id = ?', [req.params.id]);
        if (item) {
            const filePath = resolveMediaFilePath(item.filepath);
            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        await req.db.run('DELETE FROM media WHERE id = ?', [req.params.id]);
        res.json({ message: 'Media deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Multi-file upload (returns array of imageUrls)
const multiUpload = multer({ storage }).array('files', 10);
router.post('/upload/multi', protect, (req, res) => {
    multiUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const imageUrls = req.files.map(f => normalizeUploadUrl(f.path));
            res.status(201).json({ imageUrls });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });
});

// Blog Posts
router.get('/blog', async (req, res) => {
    try {
        const { category } = req.query;
        const posts = category
            ? await req.db.all('SELECT * FROM blog_posts WHERE category = ? ORDER BY created_at DESC', [category])
            : await req.db.all('SELECT * FROM blog_posts ORDER BY created_at DESC');
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.get('/blog/:id', async (req, res) => {
    try {
        const post = await req.db.get('SELECT * FROM blog_posts WHERE id = ?', [req.params.id]);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.post('/blog', protect, async (req, res) => {
    const { title, content, category, tags, imageUrl, status } = req.body;
    if (!title || !content) return res.status(400).json({ message: 'Title and content are required' });
    const normalizedImageUrl = normalizeImageUrl(imageUrl);
    try {
        const result = await req.db.run(
            'INSERT INTO blog_posts (title, content, category, tags, imageUrl, status) VALUES (?, ?, ?, ?, ?, ?)',
            [title, content, category || 'General', tags || '', normalizedImageUrl, status || 'draft']
        );
        const post = await req.db.get('SELECT * FROM blog_posts WHERE id = ?', [result.lastID]);
        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.put('/blog/:id', protect, async (req, res) => {
    const { title, content, category, tags, imageUrl, status } = req.body;
    const normalizedImageUrl = normalizeImageUrl(imageUrl);
    try {
        await req.db.run(
            'UPDATE blog_posts SET title=?, content=?, category=?, tags=?, imageUrl=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
            [title, content, category, tags, normalizedImageUrl, status, req.params.id]
        );
        const post = await req.db.get('SELECT * FROM blog_posts WHERE id = ?', [req.params.id]);
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.delete('/blog/:id', protect, async (req, res) => {
    try {
        const post = await req.db.get('SELECT * FROM blog_posts WHERE id = ?', [req.params.id]);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const imageUrl = normalizeImageUrl(post.imageUrl);
        if (isLocalUploadUrl(imageUrl)) {
            const filePath = resolveLocalUploadPath(imageUrl);
            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            await req.db.run(
                `DELETE FROM media
                 WHERE REPLACE(filepath, '\\', '/') = ?
                    OR REPLACE(filepath, '\\', '/') = ?
                    OR REPLACE(filepath, '\\', '/') = ?`,
                [imageUrl.replace(/^\//, ''), imageUrl, filePath.replace(/\\/g, '/')]
            );
        }

        await req.db.run('DELETE FROM blog_posts WHERE id = ?', [req.params.id]);
        res.json({ message: 'Post deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Launches
router.get('/launches', async (req, res) => {
    try {
        const launches = await req.db.all('SELECT * FROM launches ORDER BY launchDate DESC');
        res.json(launches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.post('/launches', protect, async (req, res) => {
    const { missionName, rocketName, launchDate, status, missionSummary, telemetryData, launchSite, payloadDescription } = req.body;
    if (!missionName) return res.status(400).json({ message: 'Mission name is required' });
    try {
        const result = await req.db.run(
            'INSERT INTO launches (missionName, rocketName, launchDate, status, missionSummary, telemetryData, launchSite, payloadDescription) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [missionName, rocketName, launchDate, status || 'scheduled', missionSummary, telemetryData, launchSite, payloadDescription]
        );
        const launch = await req.db.get('SELECT * FROM launches WHERE id = ?', [result.lastID]);
        res.status(201).json(launch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.put('/launches/:id', protect, async (req, res) => {
    const { missionName, rocketName, launchDate, status, missionSummary, telemetryData, launchSite, payloadDescription } = req.body;
    try {
        await req.db.run(
            'UPDATE launches SET missionName=?, rocketName=?, launchDate=?, status=?, missionSummary=?, telemetryData=?, launchSite=?, payloadDescription=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
            [missionName, rocketName, launchDate, status, missionSummary, telemetryData, launchSite, payloadDescription, req.params.id]
        );
        const launch = await req.db.get('SELECT * FROM launches WHERE id = ?', [req.params.id]);
        res.json(launch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.delete('/launches/:id', protect, async (req, res) => {
    try {
        await req.db.run('DELETE FROM launches WHERE id = ?', [req.params.id]);
        res.json({ message: 'Launch deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Website Editor (admin only)
router.get('/editor/pages', protect, adminOnly, async (req, res) => {
    try {
        const pages = listEditableWebsitePages();
        res.json({ pages, total: pages.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/editor/page', protect, adminOnly, async (req, res) => {
    try {
        const requestedPath = String(req.query.path || '');
        const resolved = resolveEditablePagePath(requestedPath);
        if (!resolved) {
            return res.status(400).json({ message: 'Invalid or non-editable page path' });
        }

        const content = fs.readFileSync(resolved.absolutePath, 'utf8');
        const stat = fs.statSync(resolved.absolutePath);

        res.json({
            path: resolved.relativePath,
            content,
            size: stat.size,
            updatedAt: stat.mtime.toISOString()
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/editor/page', protect, adminOnly, async (req, res) => {
    try {
        const requestedPath = String(req.query.path || '');
        const resolved = resolveEditablePagePath(requestedPath);
        if (!resolved) {
            return res.status(400).json({ message: 'Invalid or non-editable page path' });
        }

        const content = typeof req.body?.content === 'string' ? req.body.content : null;
        if (content === null) {
            return res.status(400).json({ message: 'Page content must be provided as a string' });
        }

        fs.writeFileSync(resolved.absolutePath, content, 'utf8');
        const stat = fs.statSync(resolved.absolutePath);

        res.json({
            success: true,
            message: 'Page updated successfully',
            path: resolved.relativePath,
            size: stat.size,
            updatedAt: stat.mtime.toISOString()
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Support Tickets
router.get('/tickets', protect, async (req, res) => {
    try {
        const tickets = await req.db.all('SELECT * FROM tickets ORDER BY created_at DESC');
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.post('/tickets', protect, async (req, res) => {
    const { subject, message, priority, userEmail } = req.body;
    if (!subject) return res.status(400).json({ message: 'Subject is required' });
    try {
        const result = await req.db.run(
            'INSERT INTO tickets (subject, message, priority, userEmail) VALUES (?, ?, ?, ?)',
            [subject, message, priority || 'medium', userEmail]
        );
        const ticket = await req.db.get('SELECT * FROM tickets WHERE id = ?', [result.lastID]);
        res.status(201).json(ticket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.put('/tickets/:id', protect, async (req, res) => {
    const { status, priority, subject, message } = req.body;
    try {
        await req.db.run(
            'UPDATE tickets SET status=COALESCE(?, status), priority=COALESCE(?, priority), subject=COALESCE(?, subject), message=COALESCE(?, message), updated_at=CURRENT_TIMESTAMP WHERE id=?',
            [status, priority, subject, message, req.params.id]
        );
        const ticket = await req.db.get('SELECT * FROM tickets WHERE id = ?', [req.params.id]);
        res.json(ticket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.delete('/tickets/:id', protect, async (req, res) => {
    try {
        await req.db.run('DELETE FROM tickets WHERE id = ?', [req.params.id]);
        res.json({ message: 'Ticket deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Generic form submission bridge for website pages
router.post('/forms/submit', async (req, res) => {
    try {
        const { formType, firstName, lastName, email, subject, message } = req.body || {};
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const safeSubject = subject || `${formType || 'contact'} submission`;
        const safeMessage = [
            `Form: ${formType || 'general'}`,
            `Name: ${[firstName, lastName].filter(Boolean).join(' ') || 'N/A'}`,
            `Email: ${email}`,
            `Message: ${message || ''}`
        ].join('\n');

        const result = await req.db.run(
            'INSERT INTO tickets (subject, message, priority, userEmail) VALUES (?, ?, ?, ?)',
            [safeSubject, safeMessage, 'medium', email]
        );

        const ticket = await req.db.get('SELECT * FROM tickets WHERE id = ?', [result.lastID]);
        res.status(201).json({ success: true, message: 'Form submitted successfully', ticket });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Search
router.get('/search', async (req, res) => {
    try {
        const {
            q = '',
            category = '',
            branch = '',
            minPrice = '',
            maxPrice = '',
            inStock = '',
            sort = 'newest',
            page = '1'
        } = req.query;

        const whereClauses = [];
        const params = [];

        if (q) {
            whereClauses.push('(name LIKE ? OR description LIKE ? OR category LIKE ?)');
            const qLike = `%${q}%`;
            params.push(qLike, qLike, qLike);
        }
        if (category) {
            whereClauses.push('category = ?');
            params.push(category);
        }
        if (branch) {
            whereClauses.push('category = ?');
            params.push(branch);
        }
        if (minPrice) {
            whereClauses.push('price >= ?');
            params.push(Number(minPrice));
        }
        if (maxPrice) {
            whereClauses.push('price <= ?');
            params.push(Number(maxPrice));
        }
        if (String(inStock).toLowerCase() === 'true') {
            whereClauses.push('stock > 0');
        }

        const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        let orderBy = 'created_at DESC';
        if (sort === 'price_asc') orderBy = 'price ASC';
        else if (sort === 'price_desc') orderBy = 'price DESC';
        else if (sort === 'name_asc') orderBy = 'name ASC';
        else if (sort === 'name_desc') orderBy = 'name DESC';

        const pageNum = Math.max(1, Number(page) || 1);
        const limit = 12;
        const offset = (pageNum - 1) * limit;

        const totalRow = await req.db.get(`SELECT COUNT(*) as count FROM products ${where}`, params);
        const products = await req.db.all(
            `SELECT * FROM products ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const categories = await req.db.all('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != "" ORDER BY category ASC');

        const normalized = products.map((product) => ({
            ...product,
            _id: String(product.id),
            imageUrl: product.image_url,
            images: product.image_url ? [product.image_url] : []
        }));

        const total = totalRow?.count || 0;
        res.json({
            products: normalized,
            pagination: {
                page: pageNum,
                pages: Math.max(1, Math.ceil(total / limit)),
                total,
                limit
            },
            filters: {
                categories: categories.map((c) => c.category).filter(Boolean),
                branches: ['Tech Turf', 'Quinta', 'Trend Hive', 'Click Sphere']
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/search/suggestions', async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        if (q.length < 2) return res.json({ suggestions: [] });

        const suggestions = await req.db.all(
            'SELECT id, name, category FROM products WHERE name LIKE ? ORDER BY name ASC LIMIT 8',
            [`%${q}%`]
        );

        res.json({ suggestions: suggestions.map((s) => ({ ...s, _id: String(s.id) })) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Newsletter
router.post('/newsletter/subscribe', async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        const preferences = req.body?.preferences || {};
        if (!email) return res.status(400).json({ message: 'Email is required' });

        await req.db.run(
            `INSERT INTO newsletter_subscribers (email, preferences, status, updated_at)
             VALUES (?, ?, 'active', CURRENT_TIMESTAMP)
             ON CONFLICT(email) DO UPDATE SET preferences = excluded.preferences, status = 'active', updated_at = CURRENT_TIMESTAMP`,
            [email, JSON.stringify(preferences)]
        );

        res.status(201).json({ success: true, message: 'Subscribed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Reviews
router.get('/reviews/product/:productId', async (req, res) => {
    try {
        const productId = Number(req.params.productId);
        if (!productId) return res.status(400).json({ message: 'Invalid product id' });

        const rows = await req.db.all(
            `SELECT r.*, u.name as username
             FROM product_reviews r
             LEFT JOIN users u ON r.user_id = u.id
             WHERE r.product_id = ?
             ORDER BY r.created_at DESC`,
            [productId]
        );

        const reviews = rows.map((row) => ({
            _id: String(row.id),
            id: row.id,
            productId: row.product_id,
            rating: row.rating,
            comment: row.comment,
            helpful: row.helpful || 0,
            verified: !!row.verified,
            createdAt: row.created_at,
            user: {
                username: row.username || 'Anonymous'
            }
        }));

        const avg = reviews.length
            ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length
            : 0;

        res.json({ reviews, avgRating: Number(avg.toFixed(1)) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/reviews', protect, async (req, res) => {
    try {
        const { productId, rating, comment } = req.body || {};
        const normalizedProductId = Number(productId);
        const normalizedRating = Number(rating);
        if (!normalizedProductId || normalizedRating < 1 || normalizedRating > 5) {
            return res.status(400).json({ message: 'Valid productId and rating (1-5) are required' });
        }

        const product = await req.db.get('SELECT id FROM products WHERE id = ?', [normalizedProductId]);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        const existingOrder = await req.db.get(
            'SELECT id FROM orders WHERE user_id = ? AND items LIKE ? LIMIT 1',
            [req.user.id, `%"id":${normalizedProductId}%`]
        );

        const result = await req.db.run(
            `INSERT INTO product_reviews (product_id, user_id, rating, comment, helpful, verified)
             VALUES (?, ?, ?, ?, 0, ?)`,
            [normalizedProductId, req.user.id, normalizedRating, comment || '', existingOrder ? 1 : 0]
        );

        const created = await req.db.get('SELECT * FROM product_reviews WHERE id = ?', [result.lastID]);
        res.status(201).json({
            _id: String(created.id),
            id: created.id,
            productId: created.product_id,
            rating: created.rating,
            comment: created.comment,
            helpful: created.helpful,
            verified: !!created.verified,
            createdAt: created.created_at
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/reviews/:id/helpful', async (req, res) => {
    try {
        await req.db.run(
            'UPDATE product_reviews SET helpful = COALESCE(helpful, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [req.params.id]
        );
        const updated = await req.db.get('SELECT id, helpful FROM product_reviews WHERE id = ?', [req.params.id]);
        if (!updated) return res.status(404).json({ message: 'Review not found' });
        res.json({ _id: String(updated.id), helpful: updated.helpful });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Translations
router.get('/translations/:lang', async (req, res) => {
    const lang = String(req.params.lang || 'en').toLowerCase();
    const translationMap = {
        en: {
            'nav.home': 'Home',
            'nav.products': 'Products',
            'nav.about': 'About',
            'nav.contact': 'Contact',
            'nav.cart': 'Cart',
            'nav.login': 'Login',
            'nav.register': 'Register',
            'btn.addToCart': 'Add to Cart',
            'btn.buyNow': 'Buy Now',
            'cart.empty': 'Your cart is empty',
            'cart.total': 'Total',
            'checkout.title': 'Checkout',
            'footer.copyright': '© 2026 Tech Turf. All rights reserved.'
        },
        es: {
            'nav.home': 'Inicio',
            'nav.products': 'Productos',
            'nav.about': 'Acerca de',
            'nav.contact': 'Contacto',
            'nav.cart': 'Carrito',
            'nav.login': 'Iniciar sesión',
            'nav.register': 'Registrarse',
            'btn.addToCart': 'Agregar al carrito',
            'btn.buyNow': 'Comprar ahora',
            'cart.empty': 'Tu carrito está vacío',
            'cart.total': 'Total',
            'checkout.title': 'Pagar',
            'footer.copyright': '© 2026 Tech Turf. Todos los derechos reservados.'
        },
        fr: {
            'nav.home': 'Accueil',
            'nav.products': 'Produits',
            'nav.about': 'À propos',
            'nav.contact': 'Contact',
            'nav.cart': 'Panier',
            'nav.login': 'Connexion',
            'nav.register': 'S\'inscrire',
            'btn.addToCart': 'Ajouter au panier',
            'btn.buyNow': 'Acheter maintenant',
            'cart.empty': 'Votre panier est vide',
            'cart.total': 'Total',
            'checkout.title': 'Commander',
            'footer.copyright': '© 2026 Tech Turf. Tous droits réservés.'
        },
        de: {
            'nav.home': 'Startseite',
            'nav.products': 'Produkte',
            'nav.about': 'Über uns',
            'nav.contact': 'Kontakt',
            'nav.cart': 'Warenkorb',
            'nav.login': 'Anmelden',
            'nav.register': 'Registrieren',
            'btn.addToCart': 'In den Warenkorb',
            'btn.buyNow': 'Jetzt kaufen',
            'cart.empty': 'Ihr Warenkorb ist leer',
            'cart.total': 'Gesamt',
            'checkout.title': 'Kasse',
            'footer.copyright': '© 2026 Tech Turf. Alle Rechte vorbehalten.'
        },
        zh: {
            'nav.home': '首页',
            'nav.products': '产品',
            'nav.about': '关于',
            'nav.contact': '联系',
            'nav.cart': '购物车',
            'nav.login': '登录',
            'nav.register': '注册',
            'btn.addToCart': '加入购物车',
            'btn.buyNow': '立即购买',
            'cart.empty': '您的购物车是空的',
            'cart.total': '总计',
            'checkout.title': '结账',
            'footer.copyright': '© 2026 Tech Turf. 版权所有。'
        }
    };

    res.json(translationMap[lang] || translationMap.en);
});

export default router;
