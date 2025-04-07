import { users, type User, type InsertUser } from "@shared/schema";
import crypto from "crypto";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      ...insertUser, 
      id, 
      publicKey: null, 
      faceDescriptor: null,
      emailVerified: false,
      verificationToken: null,
      verificationTokenExpiry: null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    
    return updatedUser;
  }

  async createVerificationToken(userId: number): Promise<{ token: string, expiry: number } | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const token = crypto.randomBytes(32).toString('hex');
    // Token expires after 24 hours
    const expiry = Math.floor(Date.now() / 1000) + 86400;
    
    this.users.set(userId, {
      ...user,
      verificationToken: token,
      verificationTokenExpiry: expiry
    });
    
    return { token, expiry };
  }

  async verifyUserEmail(token: string): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find(
      (user) => user.verificationToken === token && 
                user.verificationTokenExpiry && 
                user.verificationTokenExpiry > Math.floor(Date.now() / 1000)
    );
    
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null
    };
    
    this.users.set(user.id, updatedUser);
    return updatedUser;
  }

  async saveFaceDescriptor(userId: number, faceDescriptor: number[]): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      faceDescriptor
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async savePublicKey(userId: number, publicKey: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      publicKey
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
}

export const storage = new MemStorage();
