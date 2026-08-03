import { integer, pgEnum, pgTable, text, timestamp, varchar, jsonb, serial } from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const moneyArchetypeEnum = pgEnum("money_archetype", ["hustler", "giver", "protector", "enjoyer"]);
export const priorityEnum = pgEnum("priority", ["high", "medium", "low"]);
export const statusEnum = pgEnum("status", ["pending", "in_progress", "completed"]);

/**
 * Core user table backing auth flow.
 * openId now stores the Supabase Auth user id (uuid, as text).
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Lead Capture ─────────────────────────────────────────────────────────────
// Stores diagnostic leads from the Money Identity Checkpoint.
// All external notifications (Slack, email) are sent server-side from here.

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 30 }),
  moneyArchetype: moneyArchetypeEnum("moneyArchetype"),
  archetypeScore: integer("archetypeScore"),
  /** JSON blob of all question answers */
  diagnosticAnswers: jsonb("diagnosticAnswers"),
  /** Source module that triggered the checkpoint: audit | blueprint | direct */
  source: varchar("source", { length: 64 }).default("direct"),
  /** Client brand that captured the lead: keystone | universal-paints */
  clientId: varchar("clientId", { length: 64 }).default("keystone"),
  /** Whether the owner notification was sent successfully */
  notified: integer("notified").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─── Audit Results ────────────────────────────────────────────────────────────
// Stores completed Bottleneck Audit sessions for progress tracking.

export const auditResults = pgTable("audit_results", {
  id: serial("id").primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  /** JSON blob: { sales: number, cash: number, staff: number, systems: number, ownerBehaviour: number } */
  scores: jsonb("scores").notNull(),
  /** Highest-scoring bottleneck dimension */
  primaryBottleneck: varchar("primaryBottleneck", { length: 64 }),
  /** Whether money-related friction was detected (triggers Money Identity Checkpoint) */
  moneyFrictionDetected: integer("moneyFrictionDetected").default(0),
  clientId: varchar("clientId", { length: 64 }).default("keystone"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditResult = typeof auditResults.$inferSelect;
export type InsertAuditResult = typeof auditResults.$inferInsert;

// ─── Goal Items ───────────────────────────────────────────────────────────────
// Stores 90-day goal action items for the Goal Dashboard.

export const goalItems = pgTable("goal_items", {
  id: serial("id").primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  dimension: varchar("dimension", { length: 64 }),
  priority: priorityEnum("priority").default("medium"),
  status: statusEnum("status").default("pending"),
  dueWeek: integer("dueWeek"),
  clientId: varchar("clientId", { length: 64 }).default("keystone"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type GoalItem = typeof goalItems.$inferSelect;
export type InsertGoalItem = typeof goalItems.$inferInsert;

// ─── LMS Enrolments ─────────────────────────────────────────────────────────────────────────────
// Records confirmed enrolments received via Academy LMS webhook.
// Used to trigger congratulations emails and owner notifications.

export const lmsEnrolments = pgTable("lms_enrolments", {
  id: serial("id").primaryKey(),
  /** Student name from Academy LMS payload */
  studentName: varchar("studentName", { length: 255 }),
  /** Student email from Academy LMS payload */
  studentEmail: varchar("studentEmail", { length: 320 }).notNull(),
  /** Course title or ID from Academy LMS payload */
  courseTitle: varchar("courseTitle", { length: 500 }),
  courseId: varchar("courseId", { length: 64 }),
  /** Money archetype from the OS session (if known at time of enrolment) */
  moneyArchetype: varchar("moneyArchetype", { length: 64 }),
  /** Primary bottleneck from the OS session (if known) */
  primaryBottleneck: varchar("primaryBottleneck", { length: 64 }),
  /** Whether the congratulations email was sent */
  emailSent: integer("emailSent").default(0),
  /** Whether the owner notification was sent */
  ownerNotified: integer("ownerNotified").default(0),
  /** Raw webhook payload for debugging */
  rawPayload: jsonb("rawPayload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LmsEnrolment = typeof lmsEnrolments.$inferSelect;
export type InsertLmsEnrolment = typeof lmsEnrolments.$inferInsert;
