
export const getAllAnnouncements = async (req, res) => {
    try {
        const announcements = await req.db.all('SELECT * FROM announcements ORDER BY created_at DESC');
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createAnnouncement = async (req, res) => {
    const { title, content, type, startDate, endDate, pages } = req.body;
    try {
        const result = await req.db.run(
            'INSERT INTO announcements (title, content, type, startDate, endDate, pages) VALUES (?, ?, ?, ?, ?, ?)',
            [title, content, type, startDate, endDate, pages]
        );
        const newAnnouncement = await req.db.get('SELECT * FROM announcements WHERE id = ?', [result.lastID]);
        res.status(201).json(newAnnouncement);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateAnnouncement = async (req, res) => {
    const { title, content, type, status, startDate, endDate, pages } = req.body;
    try {
        await req.db.run(
            'UPDATE announcements SET title=?, content=?, type=?, status=?, startDate=?, endDate=?, pages=? WHERE id=?',
            [title, content, type, status, startDate, endDate, pages, req.params.id]
        );
        const updated = await req.db.get('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteAnnouncement = async (req, res) => {
    try {
        await req.db.run('DELETE FROM announcements WHERE id = ?', [req.params.id]);
        res.json({ message: 'Announcement deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
