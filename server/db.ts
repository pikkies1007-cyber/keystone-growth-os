import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser, users, leads, InsertLead, auditResults, InsertAuditResult, goalItems, InsertGoalItem,
  lmsEnrolments, InsertLmsEnrolment, toolkitSubmissions, InsertToolkitSubmission, toolkitSuggestions,
  winsLearnings, InsertWinLearning, growthSpurtAudits, InsertGrowthSpurtAudit,
  customerInquiries, InsertCustomerInquiry, invoices, InsertInvoice, dailyTasks, InsertDailyTask,
  employeeInvites, InsertEmployeeInvite, keystoneClients, InsertKeystoneClient,
  keystoneClientTerms, InsertKeystoneClientTerm,
} from "../drizzle/schema";
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
    // businessRole/ownerId are set only at first creation (an employee invite
    // match), never overwritten on subsequent logins — intentionally absent
    // from updateSet.
    if (user.businessRole !== undefined) values.businessRole = user.businessRole;
    if (user.ownerId !== undefined) values.ownerId = user.ownerId;
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

/**
 * The Money Identity Checkpoint captures leads by email, not userId (it's a
 * publicProcedure that can run before signup), so this is a best-effort
 * match against the signed-in user's account email. Returns undefined if
 * they've never completed the checkpoint, or completed it under a different
 * email than the one they're signed in with.
 */
export async function getLatestLeadByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(leads)
    .where(eq(leads.email, email))
    .orderBy(desc(leads.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
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

export type GoalMetric = { label: string; unit?: string; start: number; current: number; target: number };

/** Generalized goal edit -- Focus flag (priority) and/or a measurable metric. Only touches fields actually passed. */
export async function updateGoalItem(
  id: number,
  updates: { priority?: "high" | "medium" | "low"; metric?: GoalMetric | null }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.priority !== undefined) set.priority = updates.priority;
  if (updates.metric !== undefined) set.metric = updates.metric;
  return db.update(goalItems).set(set).where(eq(goalItems.id, id));
}

// ─── LMS Enrolments ─────────────────────────────────────────────────────────────────────────────

export async function createLmsEnrolment(data: InsertLmsEnrolment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(lmsEnrolments).values(data).returning();
}

// ─── Toolkit Progress Tracking ──────────────────────────────────────────────

function parseWeekNumber(text: string): number | null {
  const match = text.match(/^Week (\d+):/i);
  return match ? parseInt(match[1], 10) : null;
}

export async function saveToolkitSubmission(
  data: InsertToolkitSubmission,
  suggestionTexts?: string[],
  // When provided, each suggestion also becomes a real row in goal_items
  // (the same table the 90-Day Goal Dashboard reads from), so it shows up
  // there automatically -- no manual "Add Goal" click needed, and ticking
  // it off in either place is the same underlying update.
  goalSyncOptions?: { sessionId: string; dimension?: string | null }
): Promise<{ submissionId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [submission] = await db.insert(toolkitSubmissions).values(data).returning({ id: toolkitSubmissions.id });
  const submissionId = submission?.id ?? 0;

  if (suggestionTexts?.length) {
    if (goalSyncOptions) {
      // Redoing a toolkit should replace its synced goals, not add another
      // full duplicate batch on top of every previous attempt.
      const previousLinked = await db
        .select({ linkedGoalItemId: toolkitSuggestions.linkedGoalItemId })
        .from(toolkitSuggestions)
        .where(and(eq(toolkitSuggestions.userId, data.userId), eq(toolkitSuggestions.toolkitKey, data.toolkitKey)));
      const idsToDelete = previousLinked.map((r) => r.linkedGoalItemId).filter((id): id is number => id !== null);
      if (idsToDelete.length > 0) {
        for (const goalId of idsToDelete) {
          await db.delete(goalItems).where(eq(goalItems.id, goalId));
        }
      }

      // Create the real goal first, then the suggestion row links to it.
      for (const suggestionText of suggestionTexts) {
        const [goal] = await db
          .insert(goalItems)
          .values({
            sessionId: goalSyncOptions.sessionId,
            title: suggestionText,
            dimension: goalSyncOptions.dimension ?? null,
            priority: "medium",
            dueWeek: parseWeekNumber(suggestionText),
            clientId: "keystone",
          })
          .returning({ id: goalItems.id });

        await db.insert(toolkitSuggestions).values({
          submissionId,
          userId: data.userId,
          toolkitKey: data.toolkitKey,
          suggestionText,
          linkedGoalItemId: goal?.id ?? null,
        });
      }
    } else {
      await db.insert(toolkitSuggestions).values(
        suggestionTexts.map((suggestionText) => ({
          submissionId,
          userId: data.userId,
          toolkitKey: data.toolkitKey,
          suggestionText,
        }))
      );
    }
  }

  return { submissionId };
}

export async function getToolkitSubmissionHistory(userId: number, toolkitKey: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(toolkitSubmissions)
    .where(and(eq(toolkitSubmissions.userId, userId), eq(toolkitSubmissions.toolkitKey, toolkitKey)))
    .orderBy(desc(toolkitSubmissions.submittedAt));
}

export async function getLatestSubmissionPerToolkit(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(toolkitSubmissions)
    .where(eq(toolkitSubmissions.userId, userId))
    .orderBy(desc(toolkitSubmissions.submittedAt));

  const latestByToolkit = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestByToolkit.has(row.toolkitKey)) latestByToolkit.set(row.toolkitKey, row);
  }
  return Array.from(latestByToolkit.values());
}

export async function updateSuggestionStatus(
  id: number,
  userId: number,
  status: "not_started" | "in_progress" | "done"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Scoped to userId too, not just id -- so one user can never toggle another's suggestion.
  const [updated] = await db
    .update(toolkitSuggestions)
    .set({ status })
    .where(and(eq(toolkitSuggestions.id, id), eq(toolkitSuggestions.userId, userId)))
    .returning({ linkedGoalItemId: toolkitSuggestions.linkedGoalItemId });

  // Keep the linked goal in sync too, so ticking it off here or on the Goal
  // Dashboard reflects the exact same underlying state either way.
  if (updated?.linkedGoalItemId) {
    const goalStatus = status === "done" ? "completed" : status === "in_progress" ? "in_progress" : "pending";
    await db.update(goalItems).set({ status: goalStatus }).where(eq(goalItems.id, updated.linkedGoalItemId));
  }
}

export async function updateGoalItemStatusAndSyncSuggestion(
  id: number,
  status: "pending" | "in_progress" | "completed"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(goalItems).set({ status }).where(eq(goalItems.id, id));

  // Reverse direction: if this goal was created from a toolkit suggestion,
  // keep that suggestion's own status in sync too.
  const suggestionStatus = status === "completed" ? "done" : status === "in_progress" ? "in_progress" : "not_started";
  await db.update(toolkitSuggestions).set({ status: suggestionStatus }).where(eq(toolkitSuggestions.linkedGoalItemId, id));
}

export async function getSuggestionsByToolkit(userId: number, toolkitKey: string) {
  const db = await getDb();
  if (!db) return [];
  // Only the latest submission's suggestions -- otherwise every past
  // attempt at the same toolkit piles up as duplicates.
  const [latestSubmission] = await db
    .select({ id: toolkitSubmissions.id })
    .from(toolkitSubmissions)
    .where(and(eq(toolkitSubmissions.userId, userId), eq(toolkitSubmissions.toolkitKey, toolkitKey)))
    .orderBy(desc(toolkitSubmissions.submittedAt))
    .limit(1);
  if (!latestSubmission) return [];

  return db
    .select()
    .from(toolkitSuggestions)
    .where(eq(toolkitSuggestions.submissionId, latestSubmission.id))
    .orderBy(toolkitSuggestions.id);
}

export async function addWinLearning(data: InsertWinLearning) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(winsLearnings).values(data).returning();
}

export async function getWinsLearningsByToolkit(userId: number, toolkitKey: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(winsLearnings)
    .where(and(eq(winsLearnings.userId, userId), eq(winsLearnings.toolkitKey, toolkitKey)))
    .orderBy(desc(winsLearnings.createdAt));
}

// ─── Growth Spurt Audit ──────────────────────────────────────────────────────
// One row per visitor session (sessionId), upserted as they move through the
// public /os/growth-spurt-audit funnel: started -> completed -> contact.

export async function upsertGrowthSpurtAudit(data: InsertGrowthSpurtAudit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select({ id: growthSpurtAudits.id })
    .from(growthSpurtAudits)
    .where(eq(growthSpurtAudits.sessionId, data.sessionId))
    .limit(1);

  if (existing.length > 0) {
    const result = await db
      .update(growthSpurtAudits)
      .set(data)
      .where(eq(growthSpurtAudits.sessionId, data.sessionId))
      .returning();
    return result[0];
  }

  const result = await db.insert(growthSpurtAudits).values(data).returning();
  return result[0];
}

export async function getAllGrowthSpurtAudits() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(growthSpurtAudits).orderBy(desc(growthSpurtAudits.createdAt));
}

// ─── Customer Inquiries (per-business) ───────────────────────────────────────

export async function createCustomerInquiry(data: InsertCustomerInquiry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customerInquiries).values(data).returning();
  return result[0];
}

export async function getCustomerInquiries(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(customerInquiries)
    .where(eq(customerInquiries.ownerId, ownerId))
    .orderBy(desc(customerInquiries.createdAt));
}

export async function updateCustomerInquiry(
  id: number,
  patch: Partial<Pick<InsertCustomerInquiry, "status" | "notes" | "declinedReason" | "followUpDate" | "name" | "contact" | "source">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(customerInquiries).set(patch).where(eq(customerInquiries.id, id)).returning();
  return result[0];
}

// ─── Invoices (per-business) ─────────────────────────────────────────────────

export async function createInvoice(data: InsertInvoice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(invoices).values(data).returning();
  return result[0];
}

export async function getInvoices(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).where(eq(invoices.ownerId, ownerId)).orderBy(desc(invoices.issuedDate));
}

export async function updateInvoiceStatus(id: number, status: "sent" | "paid" | "overdue", paidDate?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(invoices)
    .set({ status, ...(paidDate !== undefined ? { paidDate } : {}) })
    .where(eq(invoices.id, id))
    .returning();
  return result[0];
}

// ─── Daily Tasks (owner + employee) ──────────────────────────────────────────

export async function createDailyTask(data: InsertDailyTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(dailyTasks).values(data).returning();
  return result[0];
}

/** All tasks for the business. Owners see this unfiltered. */
export async function getDailyTasks(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dailyTasks).where(eq(dailyTasks.ownerId, ownerId)).orderBy(dailyTasks.dueDate);
}

/** Only tasks assigned to one specific person — what an employee sees. */
export async function getDailyTasksForAssignee(ownerId: number, assignedToUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(dailyTasks)
    .where(and(eq(dailyTasks.ownerId, ownerId), eq(dailyTasks.assignedToUserId, assignedToUserId)))
    .orderBy(dailyTasks.dueDate);
}

export async function updateDailyTaskStatus(id: number, status: "pending" | "in_progress" | "completed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(dailyTasks).set({ status }).where(eq(dailyTasks.id, id)).returning();
  return result[0];
}

export async function deleteDailyTask(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(dailyTasks).where(eq(dailyTasks.id, id));
}

// ─── Business team (owner + their employees) ─────────────────────────────────

export async function getBusinessTeam(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.ownerId, ownerId));
}

// ─── Employee Invites ─────────────────────────────────────────────────────────

export async function createEmployeeInvite(data: InsertEmployeeInvite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(employeeInvites).values(data).returning();
  return result[0];
}

export async function getInvitesForOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(employeeInvites).where(eq(employeeInvites.ownerId, ownerId)).orderBy(desc(employeeInvites.invitedAt));
}

/** Matched case-sensitively by the email Supabase reports — callers should lowercase both sides. */
export async function getPendingInviteByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(employeeInvites)
    .where(and(eq(employeeInvites.email, email), eq(employeeInvites.status, "pending")))
    .orderBy(desc(employeeInvites.invitedAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function acceptInvite(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(employeeInvites).set({ status: "accepted", acceptedAt: new Date() }).where(eq(employeeInvites.id, id));
}

// ─── Keystone's Own Client CRM (admin-only) ──────────────────────────────────

export async function createKeystoneClient(data: InsertKeystoneClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(keystoneClients).values(data).returning();
  return result[0];
}

export async function getAllKeystoneClients() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(keystoneClients).orderBy(desc(keystoneClients.createdAt));
}

export async function updateKeystoneClient(
  id: number,
  patch: Partial<
    Pick<
      InsertKeystoneClient,
      | "name"
      | "businessName"
      | "contact"
      | "stage"
      | "assignedTo"
      | "route"
      | "bottleneck"
      | "discoveryDate"
      | "slaSentDate"
      | "slaSignedDate"
      | "cipcReceived"
      | "financialsReceived"
      | "baselineNetProfit"
      | "baselineAgreedDate"
      | "startDate"
      | "sharePct"
      | "termMonths"
      | "contractMonths"
      | "value"
      | "source"
      | "notes"
      | "declinedReason"
      | "lostReason"
      | "followUpDate"
    >
  >
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(keystoneClients).set(patch).where(eq(keystoneClients.id, id)).returning();
  return result[0];
}

// ─── Keystone deal terms (3-month billing terms per client) ─────────────────

export async function getTermsForClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(keystoneClientTerms).where(eq(keystoneClientTerms.clientId, clientId)).orderBy(keystoneClientTerms.termNumber);
}

export async function upsertKeystoneClientTerm(data: InsertKeystoneClientTerm) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(keystoneClientTerms)
    .where(and(eq(keystoneClientTerms.clientId, data.clientId), eq(keystoneClientTerms.termNumber, data.termNumber)));
  if (existing[0]) {
    const result = await db
      .update(keystoneClientTerms)
      .set({ netProfit: data.netProfit, feeAmount: data.feeAmount, paidDate: data.paidDate })
      .where(eq(keystoneClientTerms.id, existing[0].id))
      .returning();
    return result[0];
  }
  const result = await db.insert(keystoneClientTerms).values(data).returning();
  return result[0];
}
