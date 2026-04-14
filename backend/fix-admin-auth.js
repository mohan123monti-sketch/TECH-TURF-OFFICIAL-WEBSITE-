import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'database/database.sqlite');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

async function fixAdminAuth() {
    console.log('=== Fixing Admin Authentication ===');
    
    try {
        // Connect to database
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        // Check current users
        const users = await db.all('SELECT id, name, email, role FROM users');
        console.log('Current users:', users);

        // Check if admin user exists
        const adminUser = await db.get('SELECT * FROM users WHERE email = ?', ['admin@techturf.com']);
        
        if (!adminUser) {
            console.log('Admin user not found. Creating...');
            
            // Create admin user
            const adminPassword = await bcrypt.hash('admin123', 10);
            const result = await db.run(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Admin User', 'admin@techturf.com', adminPassword, 'admin']
            );
            
            console.log(`Created admin user with ID: ${result.lastID}`);
        } else {
            console.log('Admin user found:', adminUser);
            
            // Update role if not admin
            if (adminUser.role !== 'admin' && adminUser.role !== 'superadmin') {
                console.log('Updating user role to admin...');
                await db.run('UPDATE users SET role = ? WHERE id = ?', ['admin', adminUser.id]);
                console.log('User role updated to admin');
            }
        }

        // Test JWT token generation
        const testAdmin = await db.get('SELECT * FROM users WHERE email = ?', ['admin@techturf.com']);
        const token = jwt.sign({ id: testAdmin.id, role: testAdmin.role }, JWT_SECRET, { expiresIn: '7d' });
        
        console.log('Test JWT Token:', token);
        console.log('Token payload:', jwt.decode(token));
        
        // Verify token
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            console.log('Token verification successful:', decoded);
            console.log('Is admin?', ['admin', 'superadmin'].includes(decoded.role));
        } catch (error) {
            console.error('Token verification failed:', error.message);
        }

        // List all users with their roles
        const allUsers = await db.all('SELECT id, name, email, role FROM users ORDER BY id');
        console.log('\nAll users in database:');
        allUsers.forEach(user => {
            console.log(`- ${user.name} (${user.email}) - Role: ${user.role || 'none'}`);
        });

        await db.close();
        console.log('\n=== Admin authentication fix complete ===');
        console.log('Login credentials:');
        console.log('Email: admin@techturf.com');
        console.log('Password: admin123');
        console.log('Role: admin');
        
    } catch (error) {
        console.error('Error fixing admin auth:', error);
    }
}

// Run the fix
fixAdminAuth();
