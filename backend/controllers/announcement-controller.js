
export const getAllAnnouncements = async (req, res) => {
    try {
        const announcements = await req.db.all('SELECT * FROM announcements ORDER BY created_at DESC');
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createAnnouncement = async (req, res) => {
    const { title, content, type, status, priority, notifyUsers, startDate, endDate, pages } = req.body;
    try {
        const result = await req.db.run(
            'INSERT INTO announcements (title, content, type, status, priority, notifyUsers, startDate, endDate, pages) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, content, type, status || 'active', priority || 'medium', notifyUsers ? 1 : 0, startDate, endDate, pages]
        );
        const newAnnouncement = await req.db.get('SELECT * FROM announcements WHERE id = ?', [result.lastID]);

        if (notifyUsers) {
            req.app.get('io')?.emit('announcement:new', newAnnouncement);
        }

        res.status(201).json(newAnnouncement);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateAnnouncement = async (req, res) => {
    const { title, content, type, status, priority, notifyUsers, startDate, endDate, pages } = req.body;
    try {
        const existing = await req.db.get('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
        await req.db.run(
            'UPDATE announcements SET title=?, content=?, type=?, status=?, priority=?, notifyUsers=?, startDate=?, endDate=?, pages=? WHERE id=?',
            [
                title,
                content,
                type,
                status ?? existing?.status ?? 'active',
                priority ?? existing?.priority ?? 'medium',
                notifyUsers ?? existing?.notifyUsers ?? 1,
                startDate,
                endDate,
                pages,
                req.params.id
            ]
        );
        const updated = await req.db.get('SELECT * FROM announcements WHERE id = ?', [req.params.id]);

        if (notifyUsers) {
            req.app.get('io')?.emit('announcement:updated', updated);
        }

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteAnnouncement = async (req, res) => {
    try {
        const existing = await req.db.get('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
        await req.db.run('DELETE FROM announcements WHERE id = ?', [req.params.id]);

        if (existing) {
            req.app.get('io')?.emit('announcement:deleted', { id: String(existing.id) });
        }

        res.json({ message: 'Announcement deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
