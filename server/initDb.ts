/**
 * Database initialization script for creating schema
 */
import { neon } from '@neondatabase/serverless';
import { db, sqlDb } from './db';
import { users } from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Initialize the PostgreSQL database schema
 */
export async function initPostgresSchema() {
  if (!process.env.DATABASE_URL) {
    console.log('PostgreSQL not configured, skipping schema initialization');
    return { success: false, error: 'PostgreSQL not configured' };
  }

  try {
    console.log('Initializing PostgreSQL schema...');
    
    // Use direct Neon client with SQL tag to ensure proper method is called
    const client = neon(process.env.DATABASE_URL);
    
    // Neon client has different interfaces for different versions, handle both
    const execQuery = async (sql: string) => {
      // Try the modern API first
      if (typeof client === 'function') {
        return await client(sql);
      } 
      // Fall back to the object API if available
      else if (typeof client === 'object' && client !== null && 'query' in client) {
        return await (client as any).query(sql);
      }
      // Last resort - use a custom query method
      else {
        throw new Error('Unsupported Neon client interface');
      }
    };
    
    // Check if the table exists
    const tableExistsResult = await execQuery(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `);
    
    // Handle different result formats
    const tableExists = (
      tableExistsResult.rows?.[0]?.exists || 
      (Array.isArray(tableExistsResult) && tableExistsResult[0]?.exists)
    );
    
    // If table doesn't exist, create it
    if (!tableExists) {
      await execQuery(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          public_key TEXT,
          face_descriptor TEXT,
          email_verified BOOLEAN DEFAULT false,
          verification_token TEXT,
          verification_token_expiry INTEGER
        );
      `);
      console.log('PostgreSQL users table created successfully');
    } else {
      console.log('PostgreSQL users table already exists');
    }
    
    return { 
      success: true,
      // Return the client for connection testing in the API
      client 
    };
  } catch (error) {
    console.error('Error initializing PostgreSQL schema:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Initialize the SQLite in-memory database
 */
export async function initSQLiteSchema() {
  try {
    console.log('Initializing SQLite schema...');
    
    // Get direct access to the SQLite instance from db.ts
    const { sqlite } = await import('./db');
    
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
        // Return the SQLite instance for connection testing
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
  
  // Always initialize SQLite as our primary database
  results.sqlite = await initSQLiteSchema();
  console.log('SQLite database initialized:', results.sqlite.success);
  
  // Initialize SQL Server if needed
  try {
    const { createSqlServerTables } = await import('./sqlServerMigration');
    results.sqlServer = await createSqlServerTables();
  } catch (error) {
    console.error('Error initializing SQL Server schema:', error);
    results.sqlServer = { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
  
  return results;
}