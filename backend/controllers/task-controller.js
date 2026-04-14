// TASK (CRM) CONTROLLER

export const getTasks = async (req, res) => {
    const db = req.db;
    try {
        const tasks = await db.all(`
            SELECT t.*, p.name as project_name, u.name as assignee_name 
            FROM tasks t 
            JOIN projects p ON t.project_id = p.id
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
        `);
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createUpdateTask = async (req, res) => {
    const db = req.db;
    const { id } = req.params;
    const { project_id, user_id, title, description, status, priority, due_date } = req.body;

    try {
        if (id) {
            await db.run(
                `UPDATE tasks SET 
                    project_id=?, user_id=?, title=?, description=?, status=?, 
                    priority=?, due_date=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
                [project_id, user_id, title, description, status, priority, due_date, id]
            );
            res.json({ id, title });
        } else {
            const result = await db.run(
                `INSERT INTO tasks (
                    project_id, user_id, title, description, status, priority, due_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [project_id, user_id, title, description, status || 'todo', priority || 'medium', due_date]
            );
            res.status(201).json({ id: result.lastID, title, status });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteTask = async (req, res) => {
    const { id } = req.params;
    const db = req.db;
    try {
        await db.run('DELETE FROM tasks WHERE id = ?', [id]);
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserTasks = async (req, res) => {
    const { userId } = req.params;
    const db = req.db;
    try {
        const tasks = await db.all(`
            SELECT t.*, p.name as project_name 
            FROM tasks t 
            JOIN projects p ON t.project_id = p.id
            WHERE t.user_id = ?
            ORDER BY t.due_date ASC
        `, [userId]);
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
