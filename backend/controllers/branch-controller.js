// Branch Management Controller
export const getAllBranches = async (req, res) => {
    try {
        const branches = await req.db.all(`
            SELECT b.*, u.name as manager_name 
            FROM branches b 
            LEFT JOIN users u ON b.manager_id = u.id 
            ORDER BY b.name
        `);
        res.json(branches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getBranchById = async (req, res) => {
    try {
        const branch = await req.db.get(`
            SELECT b.*, u.name as manager_name 
            FROM branches b 
            LEFT JOIN users u ON b.manager_id = u.id 
            WHERE b.id = ?
        `, [req.params.id]);
        
        if (!branch) return res.status(404).json({ message: 'Branch not found' });
        res.json(branch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createBranch = async (req, res) => {
    const { name, address, phone, email, manager_id, status } = req.body;
    try {
        const result = await req.db.run(
            'INSERT INTO branches (name, address, phone, email, manager_id, status) VALUES (?, ?, ?, ?, ?, ?)',
            [name, address, phone, email, manager_id, status || 'active']
        );
        const newBranch = await req.db.get('SELECT * FROM branches WHERE id = ?', [result.lastID]);
        res.status(201).json(newBranch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateBranch = async (req, res) => {
    const { name, address, phone, email, manager_id, status } = req.body;
    try {
        await req.db.run(
            'UPDATE branches SET name=?, address=?, phone=?, email=?, manager_id=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
            [name, address, phone, email, manager_id, status, req.params.id]
        );
        const updatedBranch = await req.db.get('SELECT * FROM branches WHERE id = ?', [req.params.id]);
        res.json(updatedBranch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteBranch = async (req, res) => {
    try {
        await req.db.run('DELETE FROM branches WHERE id = ?', [req.params.id]);
        res.json({ message: 'Branch deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Branch Inventory Management
export const getBranchInventory = async (req, res) => {
    try {
        const inventory = await req.db.all(`
            SELECT pbi.*, p.name as product_name, p.sku, b.name as branch_name
            FROM product_branch_inventory pbi
            JOIN products p ON pbi.product_id = p.id
            JOIN branches b ON pbi.branch_id = b.id
            ORDER BY b.name, p.name
        `);
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateBranchInventory = async (req, res) => {
    const { branch_id, product_id, stock, low_stock_threshold } = req.body;
    try {
        await req.db.run(`
            INSERT OR REPLACE INTO product_branch_inventory 
            (product_id, branch_id, stock, low_stock_threshold, updated_at) 
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [product_id, branch_id, stock, low_stock_threshold]);
        
        const updated = await req.db.get(`
            SELECT pbi.*, p.name as product_name, b.name as branch_name
            FROM product_branch_inventory pbi
            JOIN products p ON pbi.product_id = p.id
            JOIN branches b ON pbi.branch_id = b.id
            WHERE pbi.product_id = ? AND pbi.branch_id = ?
        `, [product_id, branch_id]);
        
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getLowStockAlerts = async (req, res) => {
    try {
        const alerts = await req.db.all(`
            SELECT pbi.*, p.name as product_name, p.sku, b.name as branch_name
            FROM product_branch_inventory pbi
            JOIN products p ON pbi.product_id = p.id
            JOIN branches b ON pbi.branch_id = b.id
            WHERE pbi.stock <= pbi.low_stock_threshold
            ORDER BY pbi.stock ASC
        `);
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
