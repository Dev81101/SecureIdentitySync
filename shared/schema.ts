import { 
  sqliteTable as sqlServerTable,
  text,
  integer
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Using SQLite table structure as a close approximation for SQL Server
// since we don't have direct SQL Server types in drizzle-orm
export const users = sqlServerTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  publicKey: text("public_key"),
  faceDescriptor: text("face_descriptor"), // Store JSON as text
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
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
