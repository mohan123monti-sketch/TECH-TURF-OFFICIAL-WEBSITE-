import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetAdmin() {
    const dbPath = path.resolve(__dirname, 'database', 'database.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    const email = process.env.ADMIN_EMAIL || 'admin@techturf.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if exists
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

    if (user) {
        console.log('User found, updating password...');
        await db.run('UPDATE users SET password = ?, role = "admin" WHERE email = ?', [hashedPassword, email]);
    } else {
        console.log('User not found, creating...');
        await db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            ['Admin User', email, hashedPassword, 'admin']);
    }

    console.log(`Admin user ${email} is now ready with password: ${password}`);
    await db.close();
}

resetAdmin().catch(console.error);
