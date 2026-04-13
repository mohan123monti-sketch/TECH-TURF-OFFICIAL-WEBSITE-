// EMPLOYEE CONTROLLER

export const getEmployees = async (req, res) => {
    const db = req.db;
    try {
        const employees = await db.all('SELECT * FROM employees ORDER BY name ASC');
        const formatted = employees.map(e => ({
            ...e,
            skills: e.skills ? JSON.parse(e.skills) : [],
            social_links: e.social_links ? JSON.parse(e.social_links) : {}
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getEmployeeById = async (req, res) => {
    const { id } = req.params;
    const db = req.db;
    try {
        const employee = await db.get('SELECT * FROM employees WHERE id = ?', [id]);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        res.json({
            ...employee,
            skills: employee.skills ? JSON.parse(employee.skills) : [],
            social_links: employee.social_links ? JSON.parse(employee.social_links) : {}
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createEmployee = async (req, res) => {
    const {
        user_id, name, email, phone, position,
        department, salary, joining_date, bio, skills, social_links, profile_image
    } = req.body;
    const db = req.db;
    
    try {
        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        // Check if email already exists
        const existingEmployee = await db.get(
            'SELECT id, email FROM employees WHERE email = ?',
            [email]
        );

        if (existingEmployee) {
            return res.status(409).json({ 
                message: `Email "${email}" is already in use. Please use a different email address.` 
            });
        }

        // Check if user_id is already used (if provided)
        if (user_id) {
            const existingUser = await db.get(
                'SELECT id FROM employees WHERE user_id = ?',
                [user_id]
            );
            
            if (existingUser) {
                return res.status(409).json({ 
                    message: `User ID ${user_id} is already assigned to another employee.` 
                });
            }
        }

        // Proceed with insertion
        const result = await db.run(
            `INSERT INTO employees (
                user_id, name, email, phone, position, 
                department, salary, joining_date, bio, skills, social_links, profile_image
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id || null, name, email, phone, position,
                department, salary, joining_date, bio,
                JSON.stringify(skills || []), JSON.stringify(social_links || {}), profile_image
            ]
        );
        res.status(201).json({ 
            id: result.lastID, 
            name, 
            email,
            message: 'Employee added successfully'
        });
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ message: `Failed to add employee: ${error.message}` });
    }
};

export const updateEmployee = async (req, res) => {
    const { id } = req.params;
    const body = req.body;
    const db = req.db;
    try {
        await db.run(
            `UPDATE employees SET 
                name=?, phone=?, position=?, department=?, salary=?, 
                joining_date=?, bio=?, skills=?, social_links=?, profile_image=?,
                updated_at=CURRENT_TIMESTAMP WHERE id=?`,
            [
                body.name, body.phone, body.position, body.department, body.salary,
                body.joining_date, body.bio, JSON.stringify(body.skills),
                JSON.stringify(body.social_links), body.profile_image, id
            ]
        );
        res.json({ message: 'Employee updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteEmployee = async (req, res) => {
    const { id } = req.params;
    const db = req.db;
    try {
        await db.run('DELETE FROM employees WHERE id = ?', [id]);
        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
