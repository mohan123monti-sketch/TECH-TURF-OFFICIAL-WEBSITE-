// TRANSACTION CONTROLLER

export const getTransactions = async (req, res) => {
    const db = req.db;
    try {
        const transactions = await db.all(`
            SELECT t.*, p.name as project_name 
            FROM transactions t 
            LEFT JOIN projects p ON t.project_id = p.id
            ORDER BY t.created_at DESC
        `);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createTransaction = async (req, res) => {
    const { project_id, amount, type, description } = req.body;
    const db = req.db;
    try {
        const result = await db.run(
            'INSERT INTO transactions (project_id, amount, type, description) VALUES (?, ?, ?, ?)',
            [project_id, amount, type, description]
        );

        // Update project revenue if type is income
        if (type === 'income' && project_id) {
            await db.run('UPDATE projects SET revenue = revenue + ? WHERE id = ?', [amount, project_id]);
        }

        res.status(201).json({ id: result.lastID, amount, type });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
