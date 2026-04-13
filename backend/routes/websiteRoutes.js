
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../controllers/productController.js';
import { getAllOrders, getOrderById, updateOrderStatus, deleteOrder } from '../controllers/orderController.js';
import { getAllPromos, createPromo, updatePromo, deletePromo, validatePromo } from '../controllers/promoController.js';
import { getAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../controllers/announcementController.js';

const router = express.Router();

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
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Orders
router.get('/orders', getAllOrders);
router.get('/orders/:id', getOrderById);
router.put('/orders/:id/status', updateOrderStatus);
router.delete('/orders/:id', deleteOrder);

// Promos
router.get('/promos', getAllPromos);
router.post('/promos', createPromo);
router.put('/promos/:id', updatePromo);
router.delete('/promos/:id', deletePromo);
router.post('/promos/validate', validatePromo);

// Announcements
router.get('/announcements', getAllAnnouncements);
router.post('/announcements', createAnnouncement);
router.put('/announcements/:id', updateAnnouncement);
router.delete('/announcements/:id', deleteAnnouncement);

// Media
router.get('/media', async (req, res) => {
    try {
        const media = await req.db.all('SELECT * FROM media ORDER BY created_at DESC');
        res.json(media);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/media/upload', upload.single('file'), async (req, res) => {
    try {
        const { filename, path: filepath, mimetype, size } = req.file;
        const result = await req.db.run(
            'INSERT INTO media (filename, filepath, mimetype, size) VALUES (?, ?, ?, ?)',
            [filename, filepath, mimetype, size]
        );
        res.status(201).json({ id: result.lastID, filename, url: '/' + filepath });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/media/:id', async (req, res) => {
    try {
        const item = await req.db.get('SELECT * FROM media WHERE id = ?', [req.params.id]);
        if (item && fs.existsSync(item.filepath)) {
            fs.unlinkSync(item.filepath);
        }
        await req.db.run('DELETE FROM media WHERE id = ?', [req.params.id]);
        res.json({ message: 'Media deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Multi-file upload (returns array of imageUrls)
const multiUpload = multer({ storage }).array('files', 10);
router.post('/upload/multi', (req, res) => {
    multiUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const imageUrls = req.files.map(f => '/' + f.path.replace(/\\/g, '/'));
            res.status(201).json({ imageUrls });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });
});

// Blog Posts
router.get('/blog', async (req, res) => {
    try {
        const posts = await req.db.all('SELECT * FROM blog_posts ORDER BY created_at DESC');
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.post('/blog', async (req, res) => {
    const { title, content, category, tags, imageUrl, status } = req.body;
    if (!title || !content) return res.status(400).json({ message: 'Title and content are required' });
    try {
        const result = await req.db.run(
            'INSERT INTO blog_posts (title, content, category, tags, imageUrl, status) VALUES (?, ?, ?, ?, ?, ?)',
            [title, content, category || 'General', tags || '', imageUrl || '', status || 'draft']
        );
        const post = await req.db.get('SELECT * FROM blog_posts WHERE id = ?', [result.lastID]);
        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.put('/blog/:id', async (req, res) => {
    const { title, content, category, tags, imageUrl, status } = req.body;
    try {
        await req.db.run(
            'UPDATE blog_posts SET title=?, content=?, category=?, tags=?, imageUrl=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
            [title, content, category, tags, imageUrl, status, req.params.id]
        );
        const post = await req.db.get('SELECT * FROM blog_posts WHERE id = ?', [req.params.id]);
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.delete('/blog/:id', async (req, res) => {
    try {
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
router.post('/launches', async (req, res) => {
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
router.put('/launches/:id', async (req, res) => {
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
router.delete('/launches/:id', async (req, res) => {
    try {
        await req.db.run('DELETE FROM launches WHERE id = ?', [req.params.id]);
        res.json({ message: 'Launch deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Support Tickets
router.get('/tickets', async (req, res) => {
    try {
        const tickets = await req.db.all('SELECT * FROM tickets ORDER BY created_at DESC');
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.post('/tickets', async (req, res) => {
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
router.put('/tickets/:id', async (req, res) => {
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
router.delete('/tickets/:id', async (req, res) => {
    try {
        await req.db.run('DELETE FROM tickets WHERE id = ?', [req.params.id]);
        res.json({ message: 'Ticket deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
