/**
 * Functions to migrate data from SQLite to SQL Server
 */
import mssql from 'mssql';
import { db, sqlDb } from './db';
import { users } from '@shared/schema';
import { arrayToJsonString } from './dbUtils';

// Type assertion to handle the union type issue between PostgreSQL and SQLite
const dbAny = db as any;

/**
 * Creates the necessary tables in SQL Server
 */
export async function createSqlServerTables() {
  try {
    const pool = await sqlDb.connect();
    
    // Check if users table exists
    const tableExists = await pool.request()
      .query(`
        SELECT OBJECT_ID('users') AS TableExists
      `);
    
    // Create table if it doesn't exist
    if (!tableExists.recordset[0].TableExists) {
      await pool.request()
        .query(`
          CREATE TABLE users (
            id INT IDENTITY(1,1) PRIMARY KEY,
            email NVARCHAR(255) NOT NULL UNIQUE,
            name NVARCHAR(255) NOT NULL,
            public_key NVARCHAR(4000),
            face_descriptor NVARCHAR(MAX),
            email_verified BIT NOT NULL DEFAULT 0,
            verification_token NVARCHAR(255),
            verification_token_expiry INT
          )
        `);
      console.log('Users table created in SQL Server');
    } else {
      console.log('Users table already exists in SQL Server');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error creating SQL Server tables:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Migrates a user from SQLite to SQL Server
 */
export async function migrateUserToSqlServer(user: Record<string, any>) {
  try {
    const pool = await sqlDb.connect();
    
    // Check if user already exists in SQL Server
    const existingUser = await pool.request()
      .input('email', mssql.NVarChar, user.email)
      .query(`
        SELECT id FROM users WHERE email = @email
      `);
    
    if (existingUser.recordset.length > 0) {
      console.log(`User ${user.email} already exists in SQL Server`);
      return { success: true, userId: existingUser.recordset[0].id };
    }
    
    // Insert user into SQL Server
    const faceDescriptorJson = user.faceDescriptor 
      ? (typeof user.faceDescriptor === 'string' 
          ? user.faceDescriptor 
          : arrayToJsonString(user.faceDescriptor))
      : null;
      
    const result = await pool.request()
      .input('email', mssql.NVarChar, user.email)
      .input('name', mssql.NVarChar, user.name)
      .input('publicKey', mssql.NVarChar, user.publicKey || null)
      .input('faceDescriptor', mssql.NVarChar, faceDescriptorJson)
      .input('emailVerified', mssql.Bit, user.emailVerified ? 1 : 0)
      .input('verificationToken', mssql.NVarChar, user.verificationToken || null)
      .input('verificationTokenExpiry', mssql.Int, user.verificationTokenExpiry || null)
      .query(`
        INSERT INTO users (
          email, 
          name, 
          public_key, 
          face_descriptor, 
          email_verified, 
          verification_token, 
          verification_token_expiry
        )
        OUTPUT INSERTED.id
        VALUES (
          @email,
          @name,
          @publicKey,
          @faceDescriptor,
          @emailVerified,
          @verificationToken,
          @verificationTokenExpiry
        )
      `);
    
    const userId = result.recordset[0].id;
    console.log(`User ${user.email} migrated to SQL Server with ID ${userId}`);
    
    return { success: true, userId };
  } catch (error) {
    console.error('Error migrating user to SQL Server:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Migrates all users from SQLite to SQL Server
 */
export async function migrateAllUsersToSqlServer() {
  try {
    // Get all users from SQLite
    const allUsers = await dbAny.select().from(users);
    
    // Create tables in SQL Server
    const createTablesResult = await createSqlServerTables();
    if (!createTablesResult.success) {
      return { success: false, error: 'Failed to create SQL Server tables' };
    }
    
    // Migrate each user
    const migrationResults = await Promise.all(
      allUsers.map((user: Record<string, any>) => migrateUserToSqlServer(user))
    );
    
    const failed = migrationResults.filter((result: { success: boolean }) => !result.success);
    
    if (failed.length > 0) {
      console.error(`Failed to migrate ${failed.length} users`);
      return { 
        success: false, 
        error: `Failed to migrate ${failed.length} users` 
      };
    }
    
    console.log(`Successfully migrated ${allUsers.length} users to SQL Server`);
    return { success: true, count: allUsers.length };
  } catch (error) {
    console.error('Error migrating all users to SQL Server:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}