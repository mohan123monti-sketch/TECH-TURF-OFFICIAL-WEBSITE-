
export const getAllPromos = async (req, res) => {
    try {
        const promos = await req.db.all('SELECT * FROM promos ORDER BY created_at DESC');
        res.json(promos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createPromo = async (req, res) => {
    const { code, type, value, minOrder, expiryDate } = req.body;
    try {
        const result = await req.db.run(
            'INSERT INTO promos (code, type, value, minOrder, expiryDate) VALUES (?, ?, ?, ?, ?)',
            [code, type, value, minOrder, expiryDate]
        );
        const newPromo = await req.db.get('SELECT * FROM promos WHERE id = ?', [result.lastID]);
        res.status(201).json(newPromo);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updatePromo = async (req, res) => {
    const { type, value, minOrder, expiryDate, isActive } = req.body;
    try {
        await req.db.run(
            'UPDATE promos SET type=?, value=?, minOrder=?, expiryDate=?, isActive=? WHERE id=?',
            [type, value, minOrder, expiryDate, isActive ? 1 : 0, req.params.id]
        );
        const updatedPromo = await req.db.get('SELECT * FROM promos WHERE id = ?', [req.params.id]);
        res.json(updatedPromo);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deletePromo = async (req, res) => {
    try {
        await req.db.run('DELETE FROM promos WHERE id = ?', [req.params.id]);
        res.json({ message: 'Promo deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const validatePromo = async (req, res) => {
    const { code } = req.body;
    try {
        const promo = await req.db.get('SELECT * FROM promos WHERE code = ? AND isActive = 1', [code]);
        if (!promo) return res.status(404).json({ message: 'Invalid or expired promo code' });
        
        // Expiry check
        if (promo.expiryDate && new Date(promo.expiryDate) < new Date()) {
            return res.status(400).json({ message: 'Promo code has expired' });
        }
        
        res.json(promo);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
