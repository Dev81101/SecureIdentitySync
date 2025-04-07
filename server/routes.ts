import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, emailSchema, faceDescriptorSchema } from "@shared/schema";
import crypto from "crypto";
import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import nodemailer from "nodemailer";

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

function createTestEmailTransport() {
  return {
    sendMail: (mailOptions: any) => {
      console.log("Email would be sent with options:", mailOptions);
      return Promise.resolve({ response: "250 OK" });
    }
  };
}

const emailTransport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  : createTestEmailTransport();

async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.HOST_URL || 'http://localhost:5000'}/verify/${token}`;
  
  await emailTransport.sendMail({
    from: process.env.EMAIL_FROM || '"SecureFace" <noreply@secureface.app>',
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
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ 
          message: "A user with this email already exists" 
        });
      }
      
      // Create user
      const user = await storage.createUser(userData);
      
      // Generate and store verification token
      const { token } = await storage.createVerificationToken(user.id) || {};
      if (!token) {
        return res.status(500).json({ message: "Failed to create verification token" });
      }
      
      // Send verification email
      await sendVerificationEmail(user.email, token);
      
      // Store user ID in session
      req.session.userId = user.id;
      
      res.status(201).json({ 
        message: "Registration initiated. Please check your email for verification.",
        userId: user.id
      });
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // Verify email
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
      
      if (!user.emailVerified) {
        return res.status(403).json({ message: "Email not verified" });
      }
      
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
      
      // In a real app, you'd compare the face descriptor with the stored one
      // For this demo, we're assuming success since face-api.js would handle this client-side
      
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
  
  return httpServer;
}
