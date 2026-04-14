import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../database/database.sqlite');

async function checkAdmin() {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    const user = await db.get('SELECT * FROM users WHERE email = ?', ['admin@techturf.com']);
    if (user) {
        console.log('Admin user found:', user.email);
    } else {
        console.log('Admin user NOT found!');
    }
    await db.close();
}

checkAdmin();
