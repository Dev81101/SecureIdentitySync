import { users, type User, type InsertUser } from "@shared/schema";
import crypto from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { parseJsonFromDb, arrayToJsonString } from "./dbUtils";

// Type assertion to handle the union type issue between PostgreSQL and SQLite
const dbAny = db as any;

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  createVerificationToken(userId: number): Promise<{ token: string, expiry: number } | undefined>;
  verifyUserEmail(token: string): Promise<User | undefined>;
  saveFaceDescriptor(userId: number, faceDescriptor: number[]): Promise<User | undefined>;
  savePublicKey(userId: number, publicKey: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await dbAny.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await dbAny
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await dbAny
      .insert(users)
      .values({
        ...insertUser,
        email: insertUser.email.toLowerCase(),
        emailVerified: false,
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await dbAny
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async createVerificationToken(userId: number): Promise<{ token: string, expiry: number } | undefined> {
    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    // Token expires after 24 hours
    const expiry = Math.floor(Date.now() / 1000) + 86400;
    
    // Update the user with the token
    const [user] = await dbAny
      .update(users)
      .set({
        verificationToken: token,
        verificationTokenExpiry: expiry
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!user) return undefined;
    return { token, expiry };
  }

  async verifyUserEmail(token: string): Promise<User | undefined> {
    // Find the user with the given token
    const now = Math.floor(Date.now() / 1000);
    const [user] = await dbAny
      .select()
      .from(users)
      .where(eq(users.verificationToken, token));
    
    if (!user || !user.verificationTokenExpiry || user.verificationTokenExpiry < now) {
      return undefined; // Token not found or expired
    }
    
    // Mark email as verified and clear token
    const [verifiedUser] = await dbAny
      .update(users)
      .set({
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null
      })
      .where(eq(users.id, user.id))
      .returning();
    
    return verifiedUser || undefined;
  }

  async saveFaceDescriptor(userId: number, faceDescriptor: number[]): Promise<User | undefined> {
    // Convert array to JSON string for SQL Server storage
    const faceDescriptorJson = arrayToJsonString(faceDescriptor);
    
    const [user] = await dbAny
      .update(users)
      .set({ faceDescriptor: faceDescriptorJson })
      .where(eq(users.id, userId))
      .returning();
    
    return user || undefined;
  }

  async savePublicKey(userId: number, publicKey: string): Promise<User | undefined> {
    const [user] = await dbAny
      .update(users)
      .set({ publicKey })
      .where(eq(users.id, userId))
      .returning();
    
    return user || undefined;
  }
}

export const storage = new DatabaseStorage();
