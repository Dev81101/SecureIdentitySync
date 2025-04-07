import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from '@shared/schema';

const { Pool } = pkg;

// Create PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Drizzle with the pool and schema
export const db = drizzle(pool, { schema });