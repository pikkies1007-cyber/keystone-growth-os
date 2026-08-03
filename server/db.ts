import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users, leads, InsertLead, auditResults, InsertAuditResult, goalItems, InsertGoalItem, lmsEnrolments, InsertLmsEnrolment } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL, { prepare: false });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({ target: users.openId, set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Lead Capture ─────────────────────────────────────────────────────────────

export async function createLead(lead: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(leads).values(lead).returning();
  return result;
}

export async function getLeads(clientId = "keystone") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads).where(eq(leads.clientId, clientId)).orderBy(desc(leads.createdAt));
}

export async function getAllLeadsAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}

export async function getAllAuditResults() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditResults).orderBy(desc(auditResults.createdAt));
}

// ─── Audit Results ────────────────────────────────────────────────────────────

export async function saveAuditResult(data: InsertAuditResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(auditResults).values(data).returning();
}

// ─── Goal Items ───────────────────────────────────────────────────────────────

export async function getGoalItems(sessionId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(goalItems).where(eq(goalItems.sessionId, sessionId));
}

export async function createGoalItem(item: InsertGoalItem): Promise<{ dbId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(goalItems).values(item).returning({ id: goalItems.id });
  return { dbId: result[0]?.id ?? 0 };
}

export async function updateGoalItemStatus(id: number, status: "pending" | "in_progress" | "completed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(goalItems).set({ status }).where(eq(goalItems.id, id));
}

// ─── LMS Enrolments ─────────────────────────────────────────────────────────────────────────────

export async function createLmsEnrolment(data: InsertLmsEnrolment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(lmsEnrolments).values(data).returning();
}
