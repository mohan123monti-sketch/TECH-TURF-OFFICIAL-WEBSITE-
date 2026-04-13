// CALENDAR & PLANNER CONTROLLER

// --- Tasks ---
export const getTasks = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    try {
        const tasks = await db.all('SELECT * FROM planner_tasks WHERE user_id = ?', [userId]);
        // Also fetch subtasks for each task
        for (let task of tasks) {
            task.subtasks = await db.all('SELECT * FROM subtasks WHERE task_id = ?', [task.id]);
            task.isStarred = Boolean(task.isStarred);
            task.completed = Boolean(task.completed);
        }
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createUpdateTask = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    const { id, title, category, priority, deadline, status, isStarred, subtasks } = req.body;

    try {
        if (id && isNaN(id) === false) {
            // Update logic (if ID is numeric/existing)
            // simplified: we'll use a more robust upsert below
        }

        // Check if exists
        const existing = id ? await db.get('SELECT id FROM planner_tasks WHERE id = ?', [id]) : null;

        if (existing) {
            await db.run(
                `UPDATE planner_tasks SET title=?, category=?, priority=?, deadline=?, status=?, isStarred=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
                [title, category, priority, deadline, status, isStarred ? 1 : 0, id]
            );
            // Delete and re-insert subtasks for simplicity
            await db.run('DELETE FROM subtasks WHERE task_id = ?', [id]);
            if (subtasks && Array.isArray(subtasks)) {
                for (let sub of subtasks) {
                    await db.run('INSERT INTO subtasks (task_id, title, completed) VALUES (?, ?, ?)', [id, sub.title, sub.completed ? 1 : 0]);
                }
            }
            res.json({ id, title, status });
        } else {
            const result = await db.run(
                `INSERT INTO planner_tasks (user_id, title, category, priority, deadline, status, isStarred) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [userId, title, category, priority, deadline, status || 'todo', isStarred ? 1 : 0]
            );
            const newId = result.lastID;
            if (subtasks && Array.isArray(subtasks)) {
                for (let sub of subtasks) {
                    await db.run('INSERT INTO subtasks (task_id, title, completed) VALUES (?, ?, ?)', [newId, sub.title, sub.completed ? 1 : 0]);
                }
            }
            res.status(201).json({ id: newId, title, status });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteTask = async (req, res) => {
    const { id } = req.params;
    const db = req.db;
    try {
        await db.run('DELETE FROM planner_tasks WHERE id = ?', [id]);
        res.json({ message: 'Task deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Goals ---
export const getGoals = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    try {
        const goals = await db.all('SELECT * FROM goals WHERE user_id = ?', [userId]);
        res.json(goals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createUpdateGoal = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    const { id } = req.params;
    const { type, description, parentGoalId, progress } = req.body;

    try {
        if (id) {
            await db.run(
                'UPDATE goals SET type=?, description=?, parentGoalId=?, progress=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
                [type, description, parentGoalId, progress, id]
            );
            res.json({ id, description });
        } else {
            const result = await db.run(
                'INSERT INTO goals (user_id, type, description, parentGoalId, progress) VALUES (?, ?, ?, ?, ?)',
                [userId, type, description, parentGoalId, progress || 0]
            );
            res.status(201).json({ id: result.lastID, description });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Projects ---
export const getProjects = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    try {
        const projects = await db.all('SELECT * FROM projects WHERE user_id = ?', [userId]);
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createUpdateProject = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    const { id } = req.params;
    const { name, status, revenue, notes } = req.body;

    try {
        if (id) {
            await db.run(
                'UPDATE projects SET name=?, status=?, revenue=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
                [name, status, revenue, notes, id]
            );
            res.json({ id, name });
        } else {
            const result = await db.run(
                'INSERT INTO projects (user_id, name, status, revenue, notes) VALUES (?, ?, ?, ?, ?)',
                [userId, name, status, revenue || 0, notes]
            );
            res.status(201).json({ id: result.lastID, name });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Health ---
export const getHealth = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    try {
        const logs = await db.all('SELECT * FROM health_logs WHERE user_id = ?', [userId]);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createUpdateHealth = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    const { id } = req.params;
    const { date, sleepHours, workoutDone, mood, energy, studyHours } = req.body;

    try {
        if (id) {
            await db.run(
                'UPDATE health_logs SET date=?, sleepHours=?, workoutDone=?, mood=?, energy=?, studyHours=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
                [date, sleepHours, workoutDone ? 1 : 0, mood, energy, studyHours, id]
            );
            res.json({ id, date });
        } else {
            const result = await db.run(
                'INSERT INTO health_logs (user_id, date, sleepHours, workoutDone, mood, energy, studyHours) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, date, sleepHours, workoutDone ? 1 : 0, mood, energy, studyHours]
            );
            res.status(201).json({ id: result.lastID, date });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Reflections ---
export const getReflections = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    try {
        const data = await db.all('SELECT * FROM reflections WHERE user_id = ?', [userId]);
        const formatted = data.map(r => ({
            ...r,
            wins: r.wins ? JSON.parse(r.wins) : [],
            blockers: r.blockers ? JSON.parse(r.blockers) : []
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createUpdateReflection = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    const { id } = req.params;
    const { date, text, wins, blockers } = req.body;

    try {
        if (id) {
            await db.run(
                'UPDATE reflections SET date=?, text=?, wins=?, blockers=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
                [date, text, JSON.stringify(wins), JSON.stringify(blockers), id]
            );
            res.json({ id, date });
        } else {
            const result = await db.run(
                'INSERT INTO reflections (user_id, date, text, wins, blockers) VALUES (?, ?, ?, ?, ?)',
                [userId, date, text, JSON.stringify(wins), JSON.stringify(blockers)]
            );
            res.status(201).json({ id: result.lastID, date });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Planner Blocks ---
export const getPlanner = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    try {
        const blocks = await db.all('SELECT * FROM planner_blocks WHERE user_id = ?', [userId]);
        res.json(blocks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createPlannerBlock = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    const { startTime, endTime, activity, day, color } = req.body;
    try {
        const result = await db.run(
            'INSERT INTO planner_blocks (user_id, startTime, endTime, activity, day, color) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, startTime, endTime, activity, day, color]
        );
        res.status(201).json({ id: result.lastID, activity });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deletePlannerBlock = async (req, res) => {
    const { id } = req.params;
    const db = req.db;
    try {
        await db.run('DELETE FROM planner_blocks WHERE id = ?', [id]);
        res.json({ message: 'Block deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Notes ---
export const getNotes = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    try {
        const notes = await db.all('SELECT * FROM notes WHERE user_id = ?', [userId]);
        const formatted = notes.map(n => ({
            ...n,
            tags: n.tags ? JSON.parse(n.tags) : [],
            isPinned: Boolean(n.isPinned)
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createUpdateNote = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    const { id } = req.params;
    const { title, content, tags, isPinned } = req.body;

    try {
        if (id) {
            await db.run(
                'UPDATE notes SET title=?, content=?, tags=?, isPinned=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
                [title, content, JSON.stringify(tags), isPinned ? 1 : 0, id]
            );
            res.json({ id, title });
        } else {
            const result = await db.run(
                'INSERT INTO notes (user_id, title, content, tags, isPinned) VALUES (?, ?, ?, ?, ?)',
                [userId, title, content, JSON.stringify(tags), isPinned ? 1 : 0]
            );
            res.status(201).json({ id: result.lastID, title });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteNote = async (req, res) => {
    const { id } = req.params;
    const db = req.db;
    try {
        await db.run('DELETE FROM notes WHERE id = ?', [id]);
        res.json({ message: 'Note deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
