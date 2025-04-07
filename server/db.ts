import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@shared/schema';
import mssql from 'mssql';

// Create a SQLite in-memory database
console.log('Using SQLite in-memory database for simplicity');
// Use a file-based database for persistence instead of memory
const sqlite = new Database('auth.db');

// Export the SQLite database instance directly
export { sqlite };

// SQL Server connection config with Windows authentication
const sqlConfig: mssql.config = {
  server: process.env.SQL_SERVER || 'DESKTOP-S1S018',
  database: process.env.SQL_DATABASE || 'passless_auth_db',
  options: {
    encrypt: false, // Change to true if using Azure SQL
    trustServerCertificate: true, // For local dev environment
    trustedConnection: true, // For Windows authentication
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Export the SQLite database connection with Drizzle ORM
export const db = drizzle(sqlite, { schema });

// This initializes the SQL Server connection as a secondary option
export const sqlDb = new mssql.ConnectionPool(sqlConfig);
sqlDb.connect()
  .then(() => {
    console.log('Connected to SQL Server');
  })
  .catch(err => {
    console.error('Error connecting to SQL Server:', err);
  });