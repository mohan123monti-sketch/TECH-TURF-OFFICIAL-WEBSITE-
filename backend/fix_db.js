import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, './database/database.sqlite');

async function fixDB() {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    try {
        await db.run('DROP TABLE brands');
        await db.run('DROP TABLE personas');
        await db.run('DROP TABLE campaigns');
        await db.run('DROP TABLE campaign_details');
        await db.run('DROP TABLE brand_settings');
        console.log('Brandpilot tables dropped successfully to allow clean recreation.');
    } catch (e) {
        console.log('Ignore:', e.message);
    }

    const { initDatabase } = await import('./config/database.js');
    await initDatabase();
}

fixDB();
