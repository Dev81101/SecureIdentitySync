import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, emailSchema, faceDescriptorSchema, users } from "@shared/schema";
import crypto from "crypto";
import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { parseJsonFromDb } from "./dbUtils";
import nodemailer from "nodemailer";
import { db } from "./db";
import { sql } from "drizzle-orm";

// Extend the session type to include our custom properties
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    loginUserId?: number;
    loginChallenge?: string;
  }
}

function generateKeyPair() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
}

function createConsoleEmailTransport() {
  return {
    sendMail: (mailOptions: any) => {
      console.log("\n==== VERIFICATION EMAIL ====");
      console.log(`TO: ${mailOptions.to}`);
      console.log(`SUBJECT: ${mailOptions.subject}`);
      
      // Extract the verification URL from the HTML content
      const urlMatch = mailOptions.html.match(/href="([^"]+)"/);
      if (urlMatch && urlMatch[1]) {
        const verificationLink = urlMatch[1];
        
        // Make the verification link more visible in the console
        console.log('\n');
        console.log('╔═════════════════════════════════════════════════════════════════════╗');
        console.log('║                                                                     ║');
        console.log('║  🔐 VERIFICATION LINK:                                              ║');
        console.log('║                                                                     ║');
        console.log(`║  ${verificationLink}`);
        console.log('║                                                                     ║');
        console.log('║  👆 COPY & PASTE THIS LINK TO YOUR BROWSER TO VERIFY YOUR EMAIL     ║');
        console.log('║                                                                     ║');
        console.log('╚═════════════════════════════════════════════════════════════════════╝');
        console.log('\n');
      }
      
      console.log("============================\n");
      return Promise.resolve({ response: "250 OK" });
    }
  };
}

// Always use the console transport for development
const emailTransport = createConsoleEmailTransport();

async function sendVerificationEmail(email: string, token: string) {
  // Use the current URL from request or a fallback URL
  let baseUrl = process.env.HOST_URL;
  if (!baseUrl) {
    // For Replit, use the project URL
    baseUrl = 'https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co';
    // Fallback if Replit environment variables aren't available
    if (baseUrl.includes('undefined')) {
      baseUrl = 'http://localhost:5000';
    }
  }
  
  const verificationUrl = `${baseUrl}/verify/${token}`;
  
  // Log the URL for debugging
  console.log('Generated verification URL:', verificationUrl);
  
  await emailTransport.sendMail({
    from: '"SecureFace" <jakel.pannyworth@gmail.com>',
    to: email,
    subject: "Verify your email for SecureFace",
    text: `Please verify your email by clicking this link: ${verificationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Verify your email for SecureFace</h2>
        <p>Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${verificationUrl}" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        </div>
        <p>If the button doesn't work, you can also use this link:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `
  });
}

async function generateChallenge(userId: number) {
  const challenge = crypto.randomBytes(32).toString('hex');
  // In a real application, you'd store this challenge with the userId and a timestamp
  return challenge;
}

function verifySignature(publicKey: string, challenge: string, signature: string) {
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(challenge);
    return verify.verify(publicKey, Buffer.from(signature, 'base64'));
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Compares two face descriptors and returns a similarity score
 * A lower score means the faces are more similar
 * @param descriptor1 - First face descriptor 
 * @param descriptor2 - Second face descriptor
 * @returns The Euclidean distance (lower is more similar)
 */
function calculateFaceSimilarity(descriptor1: number[], descriptor2: number[]): number {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error("Face descriptors must have the same length");
  }
  
  // Calculate Euclidean distance between descriptors
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

/**
 * Determines if two face descriptors belong to the same person
 * @param descriptor1 - First face descriptor
 * @param descriptor2 - Second face descriptor
 * @param threshold - Threshold for similarity (lower is stricter)
 * @returns True if faces match, false otherwise
 */
function isSameFace(descriptor1: number[], descriptor2: number[], threshold = 0.6): boolean {
  const distance = calculateFaceSimilarity(descriptor1, descriptor2);
  return distance < threshold;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const SessionStore = MemoryStore(session);

  app.use(session({
    secret: process.env.SESSION_SECRET || 'secure-face-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 },
    store: new SessionStore({ checkPeriod: 86400000 }) // prune expired entries every 24h
  }));

  // Register a new user
  app.post('/api/register', async (req: Request, res: Response) => {
    try {
      console.log('Registration attempt with data:', JSON.stringify(req.body));
      
      // Validate input data
      const userData = insertUserSchema.parse(req.body);
      console.log('Validation passed, checking for existing user...');
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        console.log('User already exists:', userData.email);
        return res.status(409).json({ 
          message: "A user with this email already exists" 
        });
      }
      
      console.log('No existing user found, creating new user...');
      
      // Create user
      const user = await storage.createUser(userData);
      console.log('User created:', user.id);
      
      // Automatically set email as verified
      console.log('Setting email as verified for user:', user.id);
      const updatedUser = await storage.updateUser(user.id, { emailVerified: true });
      if (!updatedUser) {
        console.error('Failed to verify user email for user:', user.id);
        return res.status(500).json({ message: "Failed to verify user email" });
      }
      
      // Store user ID in session
      req.session.userId = user.id;
      console.log('User ID stored in session:', user.id);
      
      // Respond with success and direct user to face capture
      res.status(201).json({ 
        message: "Registration successful. Continue to face capture.",
        userId: user.id,
        redirectToFace: true
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.errors) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ 
        message: "Failed to register user", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Verify email - API endpoint
  app.get('/api/verify/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const user = await storage.verifyUserEmail(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }
      
      // Store user ID in session
      req.session.userId = user.id;
      
      res.status(200).json({ 
        message: "Email successfully verified",
        verified: true
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to verify email" });
    }
  });
  
  // Direct verification link handler - redirects to frontend verification page
  app.get('/verify/:token', (req: Request, res: Response) => {
    const { token } = req.params;
    // Redirect to the frontend verification page
    console.log(`Received direct verification with token: ${token}`);
    res.redirect(`/email-verification/${token}`);
  });

  // Save face descriptor
  app.post('/api/register/face', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { faceDescriptor } = faceDescriptorSchema.parse(req.body);
      
      const user = await storage.saveFaceDescriptor(req.session.userId, faceDescriptor);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate key pair
      const { publicKey, privateKey } = generateKeyPair();
      
      // Save public key to user profile
      await storage.savePublicKey(user.id, publicKey);
      
      res.status(200).json({ 
        message: "Face recognition setup complete",
        // Send private key to client for storage in browser
        privateKey 
      });
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save face descriptor" });
    }
  });

  // Login with email initiation
  app.post('/api/login/email', async (req: Request, res: Response) => {
    try {
      const { email } = emailSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Skip email verification check since we're auto-verifying emails
      
      // Generate challenge
      const challenge = await generateChallenge(user.id);
      
      // Store challenge in session
      req.session.loginChallenge = challenge;
      req.session.loginUserId = user.id;
      
      res.status(200).json({ 
        message: "Login initiated",
        challenge,
        requiresFaceRecognition: !!user.faceDescriptor
      });
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to initiate login" });
    }
  });

  // Face recognition step
  app.post('/api/login/face', async (req: Request, res: Response) => {
    try {
      if (!req.session.loginUserId) {
        return res.status(401).json({ message: "Login not initiated" });
      }
      
      const { faceDescriptor } = faceDescriptorSchema.parse(req.body);
      
      const user = await storage.getUser(req.session.loginUserId);
      if (!user || !user.faceDescriptor) {
        return res.status(404).json({ message: "User or face descriptor not found" });
      }
      
      // Parse the stored face descriptor from JSON if it's a string
      const storedDescriptor = typeof user.faceDescriptor === 'string' 
        ? parseJsonFromDb<number[]>(user.faceDescriptor)
        : user.faceDescriptor;
        
      if (!storedDescriptor) {
        return res.status(500).json({ message: "Invalid face descriptor format" });
      }
      
      // Compare the submitted face descriptor with the stored one
      console.log('Comparing face descriptors for user:', user.id);
      
      // Use our face verification function
      const matchResult = isSameFace(faceDescriptor, storedDescriptor, 0.5); // Threshold of 0.5 (stricter)
      
      if (!matchResult) {
        console.log('Face verification failed for user:', user.id);
        return res.status(401).json({ 
          message: "Face verification failed. Please try again.",
          verified: false
        });
      }
      
      console.log('Face verification successful for user:', user.id);
      res.status(200).json({ 
        message: "Face recognition successful",
        verified: true
      });
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to verify face" });
    }
  });

  // Signature verification
  app.post('/api/login/verify', async (req: Request, res: Response) => {
    try {
      if (!req.session.loginUserId || !req.session.loginChallenge) {
        return res.status(401).json({ message: "Login not initiated properly" });
      }
      
      const { signature } = req.body;
      if (!signature) {
        return res.status(400).json({ message: "Signature required" });
      }
      
      const user = await storage.getUser(req.session.loginUserId);
      if (!user || !user.publicKey) {
        return res.status(404).json({ message: "User or public key not found" });
      }
      
      const isValid = verifySignature(user.publicKey, req.session.loginChallenge, signature);
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid signature" });
      }
      
      // Login successful, store user ID in session
      req.session.userId = user.id;
      // Clear login challenge
      delete req.session.loginChallenge;
      delete req.session.loginUserId;
      
      res.status(200).json({ 
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to verify signature" });
    }
  });

  // Get current user
  app.get('/api/user', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Logout
  app.post('/api/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  // Database health check
  app.get('/api/db-status', async (req: Request, res: Response) => {
    try {
      // Define type for database status
      interface DbStatus {
        connected: boolean;
        error: string | null;
        isActive?: boolean; // Whether this database is currently being used
        tables?: string[];  // Available tables
      }
      
      // Import the database initialization utility
      const { initSQLiteSchema } = await import('./initDb');
      
      // Check SQLite connection - our only database
      const sqliteStatus: DbStatus = { 
        connected: false, 
        error: null, 
        isActive: true 
      };
      
      // Initialize SQLite schema
      try {
        // Initialize schema and get SQLite instance
        const sqliteResult = await initSQLiteSchema();
        
        if (sqliteResult.success && sqliteResult.sqlite) {
          try {
            // Test connection
            const stmt = sqliteResult.sqlite.prepare('SELECT 1 as test_value');
            const result = stmt.get() as { test_value: number };
            sqliteStatus.connected = result?.test_value === 1;
          } catch (error) {
            console.error('SQLite test query error:', error);
            sqliteStatus.error = error instanceof Error ? error.message : 'Unknown error';
          }
          
          // Get table list
          const tableStmt = sqliteResult.sqlite.prepare(`
            SELECT name FROM sqlite_master WHERE type='table'
          `);
          const tables = tableStmt.all();
          
          sqliteStatus.tables = tables.map((r: any) => r.name);
        } else {
          throw new Error(sqliteResult.error || 'SQLite initialization failed without error details');
        }
      } catch (error) {
        sqliteStatus.error = error instanceof Error ? error.message : 'Unknown error';
      }
      
      res.status(200).json({
        sqlite: sqliteStatus
      });
    } catch (error) {
      res.status(500).json({ 
        message: "Error checking database status", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Endpoint removed - SQL Server migration is no longer supported
  
  return httpServer;
}
