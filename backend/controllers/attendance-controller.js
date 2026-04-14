// ATTENDANCE CONTROLLER

export const getAttendance = async (req, res) => {
    const db = req.db;
    try {
        const attendance = await db.all(`
            SELECT a.*, e.name as employee_name 
            FROM attendance a 
            JOIN employees e ON a.employee_id = e.id
            ORDER BY a.date DESC
        `);
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const markAttendance = async (req, res) => {
    const { employee_id, date, status, checkIn, checkOut, notes } = req.body;
    const db = req.db;
    try {
        // Check if exists for that date
        const existing = await db.get('SELECT id FROM attendance WHERE employee_id = ? AND date = ?', [employee_id, date]);

        if (existing) {
            await db.run(
                'UPDATE attendance SET status = ?, checkIn = ?, checkOut = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, checkIn, checkOut, notes, existing.id]
            );
            res.json({ message: 'Attendance updated' });
        } else {
            const result = await db.run(
                'INSERT INTO attendance (employee_id, date, status, checkIn, checkOut, notes) VALUES (?, ?, ?, ?, ?, ?)',
                [employee_id, date, status, checkIn, checkOut, notes]
            );
            res.status(201).json({ id: result.lastID, employee_id, date, status });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getEmployeeAttendance = async (req, res) => {
    const { id } = req.params;
    const db = req.db;
    try {
        const attendance = await db.all('SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC', [id]);
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
