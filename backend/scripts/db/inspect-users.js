import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inspectDB() {
    const db = await open({
        filename: path.resolve(__dirname, '../../database/database.sqlite'),
        driver: sqlite3.Database
    });

    console.log('--- USERS TABLE ---');
    const users = await db.all('SELECT id, name, email, role FROM users');
    console.log(JSON.stringify(users, null, 2));

    console.log('\n--- ATTEMPTING LOGIN LOGIC ---');
    const loginEmail = 'admin@techturf.com';
    const user = await db.get('SELECT * FROM users WHERE email = ?', [loginEmail]);
    if (user) {
        console.log(`Found user: ${user.email} with ID: ${user.id}`);
    } else {
        console.log(`User ${loginEmail} NOT found!`);
        // Maybe check for similar emails
        const allEmails = await db.all('SELECT email FROM users');
        console.log('Existing emails:', allEmails.map(u => u.email));
    }

    await db.close();
}

inspectDB();
