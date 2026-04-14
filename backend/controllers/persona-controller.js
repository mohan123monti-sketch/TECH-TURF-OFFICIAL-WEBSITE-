// @desc    Get personas for user
// @route   GET /api/brandpilot/personas
export const getPersonas = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    try {
        const brands = await db.all('SELECT id FROM brands WHERE user_id = ?', [userId]);
        if (brands.length === 0) return res.json([]);

        const brandIds = brands.map(b => b.id);
        const personas = await db.all(`SELECT * FROM personas WHERE brand_id IN (${brandIds.join(',')})`);

        const formatted = personas.map(p => ({
            ...p,
            traits: p.traits ? JSON.parse(p.traits) : []
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create persona
// @route   POST /api/brandpilot/personas
export const createPersona = async (req, res) => {
    const { name, role, age, traits, painPoints } = req.body;
    const db = req.db;
    const userId = req.user.id;
    try {
        const brand = await db.get('SELECT id FROM brands WHERE user_id = ?', [userId]);
        if (!brand) return res.status(404).json({ message: 'Create a brand first' });

        const result = await db.run(
            'INSERT INTO personas (brand_id, name, role, age, traits, painPoints) VALUES (?, ?, ?, ?, ?, ?)',
            [brand.id, name, role, age, JSON.stringify(traits), painPoints]
        );
        res.status(201).json({ id: result.lastID, name, role });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
