import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@shared/schema';

// Create a SQLite database
console.log('Using SQLite database for persistence');
// Use a file-based database for persistence
const sqlite = new Database('auth.db');

// Export the SQLite database instance directly
export { sqlite };

// Export the SQLite database connection with Drizzle ORM
export const db = drizzle(sqlite, { schema });