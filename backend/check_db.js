import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, './database/database.sqlite');

async function check() {
  const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
  });

  const tables = await db.all('SELECT name FROM sqlite_master WHERE type="table"');
  console.log('Tables:', tables.map(t => t.name));
  
  // also check token for admin
  const user = await db.get('SELECT * FROM users WHERE email="admin@techturf.com"');
  console.log('Admin User:', user ? user.role : 'NOT FOUND');
}
check();
