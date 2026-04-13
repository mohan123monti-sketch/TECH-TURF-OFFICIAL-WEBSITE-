import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function checkAdmin() {
    const db = await open({
        filename: 'd:/TECH TURF/TREND HIVE/PROJECT/TECH TURF-O.1/backend/database/database.sqlite',
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
