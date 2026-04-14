// Enhanced User Management Controller
export const getAllUsers = async (req, res) => {
    try {
        const { role, department, account_status, search } = req.query;
        let query = `
            SELECT u.*, 
                   GROUP_CONCAT(DISTINCT ug.name) as groups
            FROM users u
            LEFT JOIN user_group_memberships ugm ON u.id = ugm.user_id
            LEFT JOIN user_groups ug ON ugm.group_id = ug.id
        `;
        const params = [];
        const conditions = [];
        
        if (role) {
            conditions.push('u.role = ?');
            params.push(role);
        }
        
        if (department) {
            conditions.push('u.department = ?');
            params.push(department);
        }
        
        if (account_status) {
            conditions.push('u.account_status = ?');
            params.push(account_status);
        }
        
        if (search) {
            conditions.push('(u.name LIKE ? OR u.email LIKE ? OR u.username LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' GROUP BY u.id ORDER BY u.name';
        
        const users = await req.db.all(query, params);
        
        const enhancedUsers = users.map(user => ({
            ...user,
            groups: user.groups ? user.groups.split(',') : [],
            lastLoginFormatted: user.last_login ? new Date(user.last_login).toLocaleString() : null
        }));
        
        res.json(enhancedUsers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createEnhancedUser = async (req, res) => {
    const { name, email, password, role, department, position, account_status, phone, bio, groups } = req.body;
    const db = req.db;
    
    try {
        // Check if user exists
        const userExists = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (userExists) return res.status(400).json({ message: 'User already exists' });
        
        const hashedPassword = await (await import('bcryptjs')).default.hash(password, 10);
        
        const result = await db.run(`
            INSERT INTO users (name, email, password, role, department, position, account_status, phone, bio)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, email, hashedPassword, role || 'user', department, position, account_status || 'active', phone, bio]);
        
        const userId = result.lastID;
        
        // Add to groups if specified
        if (groups && groups.length > 0) {
            for (const groupId of groups) {
                await db.run('INSERT INTO user_group_memberships (user_id, group_id, assigned_by) VALUES (?, ?, ?)', 
                    [userId, groupId, req.user.id]);
            }
        }
        
        // Log access
        await db.run('INSERT INTO access_logs (user_id, action, resource, success) VALUES (?, ?, ?, ?)', 
            [req.user.id, 'create_user', `user:${userId}`, 1]);
        
        const newUser = await db.get('SELECT id, name, email, role, department, position, account_status, phone, bio FROM users WHERE id = ?', [userId]);
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateEnhancedUser = async (req, res) => {
    const { name, email, role, department, position, account_status, phone, bio, groups } = req.body;
    const userId = req.params.id;
    
    try {
        await req.db.run(`
            UPDATE users SET 
                name=?, email=?, role=?, department=?, position=?, account_status=?, phone=?, bio=?,
                updated_at=CURRENT_TIMESTAMP
            WHERE id=?
        `, [name, email, role, department, position, account_status, phone, bio, userId]);
        
        // Update group memberships
        if (groups !== undefined) {
            // Remove existing memberships
            await req.db.run('DELETE FROM user_group_memberships WHERE user_id = ?', [userId]);
            
            // Add new memberships
            for (const groupId of groups) {
                await req.db.run('INSERT INTO user_group_memberships (user_id, group_id, assigned_by) VALUES (?, ?, ?)', 
                    [userId, groupId, req.user.id]);
            }
        }
        
        // Log access
        await req.db.run('INSERT INTO access_logs (user_id, action, resource, success) VALUES (?, ?, ?, ?)', 
            [req.user.id, 'update_user', `user:${userId}`, 1]);
        
        const updatedUser = await req.db.get(`
            SELECT u.*, GROUP_CONCAT(DISTINCT ug.name) as groups
            FROM users u
            LEFT JOIN user_group_memberships ugm ON u.id = ugm.user_id
            LEFT JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE u.id = ?
            GROUP BY u.id
        `, [userId]);
        
        res.json({
            ...updatedUser,
            groups: updatedUser.groups ? updatedUser.groups.split(',') : []
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateUserRole = async (req, res) => {
    const { role } = req.body;
    const userId = req.params.id;
    
    try {
        await req.db.run('UPDATE users SET role=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [role, userId]);
        
        // Log access
        await req.db.run('INSERT INTO access_logs (user_id, action, resource, success) VALUES (?, ?, ?, ?)', 
            [req.user.id, 'update_role', `user:${userId}`, 1]);
        
        const updatedUser = await req.db.get('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateUserStatus = async (req, res) => {
    const { account_status } = req.body;
    const userId = req.params.id;
    
    try {
        await req.db.run('UPDATE users SET account_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [account_status, userId]);
        
        // Log access
        await req.db.run('INSERT INTO access_logs (user_id, action, resource, success) VALUES (?, ?, ?, ?)', 
            [req.user.id, 'update_status', `user:${userId}`, 1]);
        
        const updatedUser = await req.db.get('SELECT id, name, email, account_status FROM users WHERE id = ?', [userId]);
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// User Groups Management
export const getAllUserGroups = async (req, res) => {
    try {
        const groups = await req.db.all(`
            SELECT ug.*, COUNT(ugm.user_id) as member_count
            FROM user_groups ug
            LEFT JOIN user_group_memberships ugm ON ug.id = ugm.group_id
            GROUP BY ug.id
            ORDER BY ug.name
        `);
        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createUserGroup = async (req, res) => {
    const { name, description, permissions } = req.body;
    
    try {
        const result = await req.db.run(`
            INSERT INTO user_groups (name, description, permissions)
            VALUES (?, ?, ?)
        `, [name, description, JSON.stringify(permissions || [])]);
        
        const newGroup = await req.db.get('SELECT * FROM user_groups WHERE id = ?', [result.lastID]);
        res.status(201).json(newGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateUserGroup = async (req, res) => {
    const { name, description, permissions } = req.body;
    
    try {
        await req.db.run(`
            UPDATE user_groups SET name=?, description=?, permissions=?, updated_at=CURRENT_TIMESTAMP
            WHERE id=?
        `, [name, description, JSON.stringify(permissions || []), req.params.id]);
        
        const updatedGroup = await req.db.get('SELECT * FROM user_groups WHERE id = ?', [req.params.id]);
        res.json(updatedGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteUserGroup = async (req, res) => {
    try {
        await req.db.run('DELETE FROM user_group_memberships WHERE group_id = ?', [req.params.id]);
        await req.db.run('DELETE FROM user_groups WHERE id = ?', [req.params.id]);
        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Bulk operations
export const bulkUpdateUsers = async (req, res) => {
    const { updates, action } = req.body; // updates: array of {id, field, value}
    
    try {
        const results = [];
        
        for (const update of updates) {
            const { id, field, value } = update;
            
            const allowedFields = ['role', 'department', 'position', 'account_status'];
            if (!allowedFields.includes(field)) {
                results.push({ id, success: false, error: 'Invalid field' });
                continue;
            }
            
            await req.db.run(`UPDATE users SET ${field}=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [value, id]);
            results.push({ id, success: true });
        }
        
        res.json({ message: 'Bulk update completed', results });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Access Logs
export const getAccessLogs = async (req, res) => {
    try {
        const { user_id, action, date_from, date_to, limit = 100 } = req.query;
        
        let query = `
            SELECT al.*, u.name as user_name, u.email as user_email
            FROM access_logs al
            LEFT JOIN users u ON al.user_id = u.id
        `;
        const params = [];
        const conditions = [];
        
        if (user_id) {
            conditions.push('al.user_id = ?');
            params.push(user_id);
        }
        
        if (action) {
            conditions.push('al.action LIKE ?');
            params.push(`%${action}%`);
        }
        
        if (date_from) {
            conditions.push('DATE(al.created_at) >= ?');
            params.push(date_from);
        }
        
        if (date_to) {
            conditions.push('DATE(al.created_at) <= ?');
            params.push(date_to);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY al.created_at DESC LIMIT ?';
        params.push(parseInt(limit));
        
        const logs = await req.db.all(query, params);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// User Analytics
export const getUserAnalytics = async (req, res) => {
    try {
        const analytics = await req.db.all(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
                COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users,
                COUNT(CASE WHEN account_status = 'active' THEN 1 END) as active_users,
                COUNT(CASE WHEN account_status = 'suspended' THEN 1 END) as suspended_users,
                COUNT(CASE WHEN last_login >= date('now', '-7 days') THEN 1 END) as recently_active,
                COUNT(DISTINCT department) as total_departments
            FROM users
        `);
        
        const departmentBreakdown = await req.db.all(`
            SELECT department, COUNT(*) as count
            FROM users
            WHERE department IS NOT NULL AND department != ''
            GROUP BY department
            ORDER BY count DESC
        `);
        
        const roleBreakdown = await req.db.all(`
            SELECT role, COUNT(*) as count
            FROM users
            GROUP BY role
            ORDER BY count DESC
        `);
        
        const recentLogins = await req.db.all(`
            SELECT u.name, u.email, u.last_login
            FROM users u
            WHERE u.last_login IS NOT NULL
            ORDER BY u.last_login DESC
            LIMIT 10
        `);
        
        res.json({
            summary: analytics[0],
            departmentBreakdown,
            roleBreakdown,
            recentLogins
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
