import Database from 'better-sqlite3';
const db = new Database('auth.db');

console.log("--- Users Table Structure ---");
const tableInfo = db.prepare(`PRAGMA table_info(users)`).all();
console.log(tableInfo);

console.log("\n--- Users in Database ---");
const users = db.prepare('SELECT * FROM users').all();
console.log(JSON.stringify(users, null, 2));