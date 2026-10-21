import { integer, numeric, pgEnum, pgTable, text, timestamp, date, varchar, jsonb, serial, type AnyPgColumn } from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const moneyArchetypeEnum = pgEnum("money_archetype", ["hustler", "giver", "protector", "enjoyer"]);
export const priorityEnum = pgEnum("priority", ["high", "medium", "low"]);
export const statusEnum = pgEnum("status", ["pending", "in_progress", "completed"]);
// Business-level role, separate from `role` (which is the system/support role:
// user vs Keystone-staff admin). An "owner" runs their own business on the
// platform; an "employee" is invited by an owner and sees a filtered view of
// that same business's tasks. Pre-existing users default to "owner".
export const businessRoleEnum = pgEnum("business_role", ["owner", "employee"]);

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
  businessRole: businessRoleEnum("businessRole").default("owner").notNull(),
  /** For an employee, the users.id of the business owner account they belong to. Null for owners. */
  ownerId: integer("ownerId").references((): AnyPgColumn => users.id),
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
  /** Optional measurable target, e.g. { label: "Reviews", unit: "reviews", start: 10, current: 14, target: 30 }. Null = plain checkbox goal. */
  metric: jsonb("metric"),
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

// ─── Toolkit Progress Tracking ──────────────────────────────────────────────
// Persists toolkit completions (replacing sessionStorage), their suggested
// next actions, and a wins/learnings log against each. Additive only.

export const suggestionStatusEnum = pgEnum("suggestion_status", ["not_started", "in_progress", "done"]);
export const winLearningTypeEnum = pgEnum("win_learning_type", ["win", "learning"]);

/** One row per toolkit completion — never overwritten, so history/comparison is just a date filter. */
export const toolkitSubmissions = pgTable("toolkit_submissions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  toolkitKey: varchar("toolkitKey", { length: 64 }).notNull(),
  inputData: jsonb("inputData").notNull(),
  resultSummary: jsonb("resultSummary").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

export type ToolkitSubmission = typeof toolkitSubmissions.$inferSelect;
export type InsertToolkitSubmission = typeof toolkitSubmissions.$inferInsert;

/** The suggested next actions a submission produced, each with its own execution status. */
export const toolkitSuggestions = pgTable("toolkit_suggestions", {
  id: serial("id").primaryKey(),
  submissionId: integer("submissionId").notNull(),
  userId: integer("userId").notNull(),
  toolkitKey: varchar("toolkitKey", { length: 64 }).notNull(),
  suggestionText: text("suggestionText").notNull(),
  status: suggestionStatusEnum("status").default("not_started").notNull(),
  // Links to a real row in goal_items, created automatically alongside this
  // suggestion, so the Progress page and the 90-Day Goal Dashboard show and
  // update the exact same underlying data instead of two separate trackers.
  linkedGoalItemId: integer("linkedGoalItemId"),
  statusUpdatedAt: timestamp("statusUpdatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ToolkitSuggestion = typeof toolkitSuggestions.$inferSelect;
export type InsertToolkitSuggestion = typeof toolkitSuggestions.$inferInsert;

/** Freeform wins/learnings logged against a toolkit — voice or text, any time. */
export const winsLearnings = pgTable("wins_learnings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  toolkitKey: varchar("toolkitKey", { length: 64 }).notNull(),
  submissionId: integer("submissionId"),
  type: winLearningTypeEnum("type").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WinLearning = typeof winsLearnings.$inferSelect;
export type InsertWinLearning = typeof winsLearnings.$inferInsert;

// ─── Growth Spurt Audit ──────────────────────────────────────────────────────
// Lead-qualification funnel for the Keystone Business Group "Growth Spurt"
// offer, served publicly at /os/growth-spurt-audit (no login required).
// One row per visitor session, upserted by sessionId as they progress through
// started -> completed -> contact. Fully separate from `leads` (Money Identity
// Checkpoint) because the shape of the data (phone, business name, severity,
// 14 distinct answers) doesn't fit that table.

export const growthSpurtStageEnum = pgEnum("growth_spurt_stage", ["started", "completed", "contact"]);

export const growthSpurtAudits = pgTable("growth_spurt_audits", {
  id: serial("id").primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  stage: growthSpurtStageEnum("stage").default("started").notNull(),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 320 }),
  businessName: varchar("businessName", { length: 255 }),
  /** Honeypot field value — non-empty means a bot filled it in. */
  website: varchar("website", { length: 255 }),
  category: varchar("category", { length: 64 }),
  severity: varchar("severity", { length: 32 }),
  severityScore: integer("severityScore"),
  /** JSON array of the 3-5 observable symptom strings shown on the report */
  symptoms: jsonb("symptoms"),
  /** JSON object of all 14 question answers, keyed q1_years_in_business etc */
  answers: jsonb("answers"),
  preferredContact: varchar("preferredContact", { length: 32 }),
  /** Whether the owner email notification was sent for this row's current stage */
  notified: integer("notified").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type GrowthSpurtAudit = typeof growthSpurtAudits.$inferSelect;
export type InsertGrowthSpurtAudit = typeof growthSpurtAudits.$inferInsert;

// ─── Customer Inquiries (per-business, every subscriber's own leads) ────────
// This is NOT Keystone Business Group's own leads (see `leads` /
// `growth_spurt_audits` above) — it's the inquiry/lead tracker each
// Growth OS subscriber uses for their own business's customers, feeding
// their Dashboard "Insights" widget (inquiries / declined / follow-ups).

export const inquiryStatusEnum = pgEnum("inquiry_status", ["new", "follow_up", "declined", "converted"]);

export const customerInquiries = pgTable("customer_inquiries", {
  id: serial("id").primaryKey(),
  /** The business this inquiry belongs to — always an owner's users.id, even if an employee logged it. */
  ownerId: integer("ownerId").notNull(),
  /** Who actually logged this record — the owner or one of their employees. */
  createdByUserId: integer("createdByUserId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  contact: varchar("contact", { length: 255 }),
  source: varchar("source", { length: 128 }),
  status: inquiryStatusEnum("status").default("new").notNull(),
  notes: text("notes"),
  declinedReason: text("declinedReason"),
  followUpDate: date("followUpDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type CustomerInquiry = typeof customerInquiries.$inferSelect;
export type InsertCustomerInquiry = typeof customerInquiries.$inferInsert;

// ─── Invoices (per-business) ─────────────────────────────────────────────────

export const invoiceStatusEnum = pgEnum("invoice_status", ["sent", "paid", "overdue"]);

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  createdByUserId: integer("createdByUserId").notNull(),
  /** Optional link back to the customer this invoice was billed to. */
  customerInquiryId: integer("customerInquiryId"),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  description: varchar("description", { length: 500 }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: invoiceStatusEnum("status").default("sent").notNull(),
  issuedDate: date("issuedDate").notNull(),
  dueDate: date("dueDate"),
  paidDate: date("paidDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// ─── Daily Tasks (owner + employee operational to-dos) ───────────────────────
// Separate from `goal_items` (90-day strategic FAST goals). These are the
// day-to-day tasks shown on the "Today" view — owners see everything across
// the business, employees see only what's assigned to them.

export const dailyTasks = pgTable("daily_tasks", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  createdByUserId: integer("createdByUserId").notNull(),
  /** Null = unassigned / owner's own task. Set = assigned to a specific employee. */
  assignedToUserId: integer("assignedToUserId"),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  dueDate: date("dueDate"),
  status: statusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type DailyTask = typeof dailyTasks.$inferSelect;
export type InsertDailyTask = typeof dailyTasks.$inferInsert;

// ─── Employee Invites ─────────────────────────────────────────────────────────
// An owner invites a teammate by email. There's no account for them yet — it
// is created the moment they actually sign in (via the existing Supabase
// magic-link flow) with that exact email address, at which point the invite
// is matched by email and the new user row is created as businessRole
// "employee" with ownerId set, instead of the normal "owner" default.

export const inviteStatusEnum = pgEnum("invite_status", ["pending", "accepted"]);

export const employeeInvites = pgTable("employee_invites", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  status: inviteStatusEnum("status").default("pending").notNull(),
  invitedAt: timestamp("invitedAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
});

export type EmployeeInvite = typeof employeeInvites.$inferSelect;
export type InsertEmployeeInvite = typeof employeeInvites.$inferInsert;

// ─── Keystone's Own Client CRM (admin-only) ──────────────────────────────────
// Sulette's own pipeline of Keystone Business Group clients/prospects —
// completely separate from what Growth OS subscribers see. Not fed by
// `leads`/`growth_spurt_audits` automatically (those stay as-is); this is
// Sulette's own simple working CRM, styled off her DebtSuccess CRM.

export const clientStageEnum = pgEnum("client_stage", ["lead", "contacted", "proposal", "client", "declined"]);

export const keystoneClients = pgTable("keystone_clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  businessName: varchar("businessName", { length: 255 }),
  contact: varchar("contact", { length: 255 }),
  stage: clientStageEnum("stage").default("lead").notNull(),
  /** The engagement's value — e.g. an estimate of 30% of net growth for the first term. */
  value: numeric("value", { precision: 12, scale: 2 }),
  source: varchar("source", { length: 128 }),
  notes: text("notes"),
  declinedReason: text("declinedReason"),
  followUpDate: date("followUpDate"),
  createdByUserId: integer("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type KeystoneClient = typeof keystoneClients.$inferSelect;
export type InsertKeystoneClient = typeof keystoneClients.$inferInsert;
