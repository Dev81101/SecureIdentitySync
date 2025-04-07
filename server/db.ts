import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@shared/schema';
import { drizzle as drizzlePg } from 'drizzle-orm/neon-serverless';
import { neon, neonConfig } from '@neondatabase/serverless';
import mssql from 'mssql';

// Check for PostgreSQL connection info
let usePostgres = false;
let neonClient: any;

try {
  if (process.env.DATABASE_URL) {
    neonConfig.fetchConnectionCache = true;
    neonClient = neon(process.env.DATABASE_URL);
    usePostgres = true;
    console.log('PostgreSQL connection available');
  }
} catch (error) {
  console.error('Error setting up PostgreSQL:', error);
}

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

// Database connection priority:
// 1. PostgreSQL if DATABASE_URL is available
// 2. SQLite as a fallback
const sqlite = new Database(':memory:');

// Export the appropriate database connection
export const db = usePostgres 
  ? drizzlePg(neonClient, { schema }) 
  : drizzle(sqlite, { schema });

// This initializes the SQL Server connection as a secondary option
export const sqlDb = new mssql.ConnectionPool(sqlConfig);
sqlDb.connect()
  .then(() => {
    console.log('Connected to SQL Server');
  })
  .catch(err => {
    console.error('Error connecting to SQL Server:', err);
    if (!usePostgres) {
      console.log('Using SQLite as fallback');
    } else {
      console.log('Using PostgreSQL as primary database');
    }
  });