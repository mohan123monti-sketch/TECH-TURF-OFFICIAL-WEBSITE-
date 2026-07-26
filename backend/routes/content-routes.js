import express from 'express';
import { protect, adminOnly } from '../middleware/auth-middleware.js';

const router = express.Router();

// @route   GET /api/content/:pageId
// @desc    Get content for a specific page
// @access  Public
router.get('/:pageId', async (req, res) => {
    try {
        const { pageId } = req.params;
        const db = req.db;
        
        const row = await db.get('SELECT content FROM page_content WHERE page_id = ?', [pageId]);
        
        if (!row) {
            return res.status(200).json({ sections: {} });
        }
        
        res.json({ sections: JSON.parse(row.content) });
    } catch (error) {
        console.error('Error fetching page content:', error);
        res.status(500).json({ message: 'Server error fetching page content' });
    }
});

// @route   PUT /api/content/:pageId
// @desc    Update content for a specific page
// @access  Private/Admin
router.put('/:pageId', protect, adminOnly, async (req, res) => {
    try {
        const { pageId } = req.params;
        const { sections } = req.body;
        const db = req.db;
        
        const contentStr = JSON.stringify(sections);
        
        const existing = await db.get('SELECT id FROM page_content WHERE page_id = ?', [pageId]);
        
        if (existing) {
            await db.run('UPDATE page_content SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE page_id = ?', [contentStr, pageId]);
        } else {
            await db.run('INSERT INTO page_content (page_id, content) VALUES (?, ?)', [pageId, contentStr]);
        }
        
        res.json({ message: 'Content updated successfully' });
    } catch (error) {
        console.error('Error updating page content:', error);
        res.status(500).json({ message: 'Server error updating page content' });
    }
});

export default router;
