// PROJECT CONTROLLER

export const getProjects = async (req, res) => {
    const db = req.db;
    try {
        const projects = await db.all(`
            SELECT p.*, c.fullName as client_name, u.name as manager_name 
            FROM projects p 
            JOIN clients c ON p.client_id = c.id
            LEFT JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        `);
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getProjectById = async (req, res) => {
    const { id } = req.params;
    const db = req.db;
    try {
        const project = await db.get(`
            SELECT p.*, c.fullName as client_name, u.name as manager_name 
            FROM projects p 
            JOIN clients c ON p.client_id = c.id
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `, [id]);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Also fetch tasks for the project
        project.tasks = await db.all('SELECT * FROM tasks WHERE project_id = ?', [id]);

        res.json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createProject = async (req, res) => {
    const { client_id, user_id, name, description, status, start_date, end_date, budget, priority, tags, notes } = req.body;
    const db = req.db;
    try {
        const result = await db.run(
            `INSERT INTO projects (
                client_id, user_id, name, description, status, 
                start_date, end_date, budget, priority, tags, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [client_id, user_id, name, description, status || 'pending', start_date, end_date, budget || 0, priority || 'medium', tags, notes]
        );
        res.status(201).json({ id: result.lastID, name, status });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProject = async (req, res) => {
    const { id } = req.params;
    const body = req.body;
    const db = req.db;
    try {
        await db.run(
            `UPDATE projects SET 
                client_id=?, user_id=?, name=?, description=?, status=?, 
                start_date=?, end_date=?, budget=?, priority=?, tags=?, notes=?,
                updated_at=CURRENT_TIMESTAMP WHERE id=?`,
            [
                body.client_id, body.user_id, body.name, body.description, body.status,
                body.start_date, body.end_date, body.budget, body.priority, body.tags, body.notes, id
            ]
        );
        res.json({ message: 'Project updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteProject = async (req, res) => {
    const { id } = req.params;
    const db = req.db;
    try {
        await db.run('DELETE FROM projects WHERE id = ?', [id]);
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
