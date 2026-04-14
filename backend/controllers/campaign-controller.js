// @desc    Get all campaigns
// @route   GET /api/campaigns
export const getCampaigns = async (req, res) => {
    const db = req.db;
    try {
        const campaigns = await db.all(`
            SELECT c.*, b.name AS brand_name 
            FROM campaigns c 
            JOIN brands b ON c.brand_id = b.id
        `);
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create campaign
// @route   POST /api/campaigns
export const createCampaign = async (req, res) => {
    const { brand_id, name, objective, status } = req.body;
    const db = req.db;
    try {
        const result = await db.run(
            'INSERT INTO campaigns (brand_id, name, objective, status) VALUES (?, ?, ?, ?)',
            [brand_id, name, objective, status || 'draft']
        );
        res.status(201).json({ id: result.lastID, brand_id, name, objective, status });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
