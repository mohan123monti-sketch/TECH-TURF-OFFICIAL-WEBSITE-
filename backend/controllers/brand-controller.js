// BRAND OPERATIONS

// @desc    Get brand for current user
// @route   GET /api/brandpilot/brand
export const getBrand = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    try {
        const brand = await db.get('SELECT * FROM brands WHERE user_id = ?', [userId]);
        if (brand) {
            brand.keywords = brand.keywords ? JSON.parse(brand.keywords) : [];
            brand.bannedWords = brand.bannedWords ? JSON.parse(brand.bannedWords) : [];
            res.json(brand);
        } else {
            res.json({});
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Save/Update brand
// @route   POST /api/brandpilot/brand
export const saveBrand = async (req, res) => {
    const { name, industry, description, tone, voiceArchetype, values_text, keywords, bannedWords, audience, logo_url } = req.body;
    const db = req.db;
    const userId = req.user.id;

    try {
        const existing = await db.get('SELECT id FROM brands WHERE user_id = ?', [userId]);
        if (existing) {
            await db.run(
                `UPDATE brands SET 
                name=?, industry=?, description=?, tone=?, voiceArchetype=?, 
                values_text=?, keywords=?, bannedWords=?, audience=?, logo_url=?, updated_at=CURRENT_TIMESTAMP
                WHERE user_id=?`,
                [name, industry, description, tone, voiceArchetype, values_text, JSON.stringify(keywords), JSON.stringify(bannedWords), audience, logo_url, userId]
            );
        } else {
            await db.run(
                `INSERT INTO brands 
                (user_id, name, industry, description, tone, voiceArchetype, values_text, keywords, bannedWords, audience, logo_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, name, industry, description, tone, voiceArchetype, values_text, JSON.stringify(keywords), JSON.stringify(bannedWords), audience, logo_url]
            );
        }
        res.status(200).json({ message: 'Brand saved' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// SETTINGS OPERATIONS

// @desc    Get settings
// @route   GET /api/brandpilot/settings
export const getSettings = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    try {
        const settings = await db.get('SELECT * FROM brand_settings WHERE user_id = ?', [userId]);
        res.json(settings || { n8nWebhookUrl: "", zapierWebhookUrl: "", enableN8n: false, enableZapier: false });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Save settings
// @route   POST /api/brandpilot/settings
export const saveSettings = async (req, res) => {
    const { n8nWebhookUrl, zapierWebhookUrl, enableN8n, enableZapier } = req.body;
    const db = req.db;
    const userId = req.user.id;
    try {
        await db.run(`INSERT OR REPLACE INTO brand_settings (user_id, n8nWebhookUrl, zapierWebhookUrl, enableN8n, enableZapier) VALUES (?, ?, ?, ?, ?)`,
            [userId, n8nWebhookUrl, zapierWebhookUrl, enableN8n ? 1 : 0, enableZapier ? 1 : 0]
        );
        res.json({ message: 'Settings saved' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
