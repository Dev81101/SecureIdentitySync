import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  publicKey: text("public_key"),
  faceDescriptor: jsonb("face_descriptor"),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpiry: integer("verification_token_expiry"),
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    email: true,
    name: true,
  })
  .extend({
    email: z.string().email("Please enter a valid email address"),
    name: z.string().min(2, "Name must be at least 2 characters"),
  });

export const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const faceDescriptorSchema = z.object({
  faceDescriptor: z.array(z.number()),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type EmailInput = z.infer<typeof emailSchema>;
export type FaceDescriptorInput = z.infer<typeof faceDescriptorSchema>;
