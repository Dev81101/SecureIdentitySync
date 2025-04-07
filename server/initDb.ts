/**
 * Database initialization script for creating schema
 */
import { sqlite } from './db';

/**
 * Initialize the SQLite database schema
 */
export async function initSQLiteSchema() {
  try {
    console.log('Initializing SQLite schema...');
    
    try {
      // Create the users table directly
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          public_key TEXT,
          face_descriptor TEXT,
          email_verified INTEGER DEFAULT 0,
          verification_token TEXT,
          verification_token_expiry INTEGER
        );
      `);
      
      console.log('SQLite users table created successfully');
      
      // Test that the table was created
      const tables = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
      console.log('Available tables:', tables.map((t: any) => t.name).join(', '));
      
      return { 
        success: true,
        sqlite: sqlite
      };
    } catch (innerError) {
      console.error('Error with SQLite setup:', innerError);
      throw innerError;
    }
  } catch (error) {
    console.error('Error initializing SQLite schema:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Initialize all database schemas
 */
export async function initAllDatabases() {
  const results: Record<string, any> = {};
  
  // Initialize SQLite as our only database
  results.sqlite = await initSQLiteSchema();
  console.log('SQLite database initialized:', results.sqlite.success);
  
  return results;
}