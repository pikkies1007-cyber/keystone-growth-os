import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, adminProcedure, protectedProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { getCoachReply, suggestFocusGoals } from "./_core/coach";
import { transcribeAudio } from "./_core/voiceTranscription";
import {
  createLead, saveAuditResult, getGoalItems, createGoalItem, updateGoalItemStatus, updateGoalItem, getAllLeadsAdmin, getAllAuditResults,
  saveToolkitSubmission, getToolkitSubmissionHistory, getLatestSubmissionPerToolkit, updateSuggestionStatus,
  getSuggestionsByToolkit, addWinLearning, getWinsLearningsByToolkit, updateGoalItemStatusAndSyncSuggestion,
  upsertGrowthSpurtAudit, getAllGrowthSpurtAudits,
  createCustomerInquiry, getCustomerInquiries, updateCustomerInquiry,
  createInvoice, getInvoices, updateInvoiceStatus,
  createDailyTask, getDailyTasks, getDailyTasksForAssignee, updateDailyTaskStatus, deleteDailyTask,
  getBusinessTeam, createEmployeeInvite, getInvitesForOwner,
  createKeystoneClient, getAllKeystoneClients, updateKeystoneClient, getTermsForClient, upsertKeystoneClientTerm,
} from "./db";
import { sendLeadCaptureConfirmation, sendOwnerLeadNotification, sendWealthResetEnrolment, sendEmployeeInviteEmail } from "./email";
import type { User } from "../drizzle/schema";
import { z } from "zod";

/** Keystone's real deal-pipeline workflow, ported from Sulette's DebtSuccess CRM. */
const KS_STAGES = [
  "Audit completed",
  "Discovery meeting booked",
  "Discovery meeting held",
  "SLA sent",
  "SLA signed",
  "Documents & baseline",
  "Term 1 (set-up, no fee)",
  "Profit share active",
  "Completed",
  "Lost",
] as const;
const KS_DIRECTORS = ["Sulette", "Clifford", "Mauritz"] as const;
const KS_ROUTES = ["Sales", "Delegation", "Funding"] as const;

/**
 * The business account a user's inquiries/invoices/tasks roll up to.
 * Owners are their own business; employees roll up to the owner that
 * invited them (ctx.user.ownerId).
 */
function businessOwnerId(user: User): number {
  return user.businessRole === "employee" && user.ownerId ? user.ownerId : user.id;
}

// ─── Lead Capture Router ──────────────────────────────────────────────────────

const leadsRouter = router({
  /**
   * Securely captures a Money Identity Checkpoint lead.
   * All external notifications (owner alert) are sent server-side.
   * No Supabase, Slack, or EmailJS credentials are ever exposed to the browser.
   */
  capture: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(320),
        whatsapp: z.string().max(30).optional(),
        moneyArchetype: z.enum(["hustler", "giver", "protector", "enjoyer"]).optional(),
        archetypeScore: z.number().int().min(0).max(100).optional(),
        diagnosticAnswers: z.record(z.string(), z.number()).optional(),
        source: z.string().max(64).optional(),
        clientId: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const lead = await createLead({
        name: input.name,
        email: input.email,
        whatsapp: input.whatsapp ?? null,
        moneyArchetype: input.moneyArchetype ?? null,
        archetypeScore: input.archetypeScore ?? null,
        diagnosticAnswers: input.diagnosticAnswers ?? null,
        source: input.source ?? "direct",
        clientId: input.clientId ?? "keystone",
        notified: 0,
      });

      // Fire-and-forget emails — failures must never block the lead save
      void (async () => {
        try {
          // 1. Confirmation email to the user
          await sendLeadCaptureConfirmation({
            name: input.name,
            email: input.email,
            archetype: input.moneyArchetype ?? null,
            archetypeScore: input.archetypeScore ?? null,
          });
        } catch (err) {
          console.error("[Leads] User confirmation email failed:", err);
        }

        try {
          // 2. Owner notification email (Resend)
          await sendOwnerLeadNotification({
            name: input.name,
            email: input.email,
            whatsapp: input.whatsapp ?? null,
            archetype: input.moneyArchetype ?? null,
            archetypeScore: input.archetypeScore ?? null,
            primaryBottleneck: null, // audit not yet done at this point
          });
        } catch (err) {
          console.error("[Leads] Owner email notification failed:", err);
        }

        try {
          // 3. In-app owner notification (Manus notification system)
          const archetypeLabel = input.moneyArchetype
            ? input.moneyArchetype.charAt(0).toUpperCase() + input.moneyArchetype.slice(1)
            : "Unknown";
          await notifyOwner({
            title: `New Lead: ${input.name} (${archetypeLabel})`,
            content: `Name: ${input.name}\nEmail: ${input.email}\nWhatsApp: ${input.whatsapp ?? "Not provided"}\nArchetype: ${archetypeLabel}\nScore: ${input.archetypeScore ?? "N/A"}%`,
          });
        } catch (err) {
          console.error("[Leads] In-app owner notification failed:", err);
        }
      })();

      return { success: true };
    }),

  /**
   * Sends the 21-Day Wealth Reset enrolment confirmation email.
   * Called from the frontend when the user clicks the enrolment CTA.
   */
  sendWealthResetEmail: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(320),
        archetype: z.string().max(64).nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Non-throwing — email failure must never block the enrolment flow
      try {
        await sendWealthResetEnrolment({
          name: input.name,
          email: input.email,
          archetype: input.archetype ?? null,
        });
      } catch (err) {
        console.error("[Leads] Wealth Reset enrolment email failed:", err);
      }
      return { success: true };
    }),
});

// ─── Audit Router ─────────────────────────────────────────────────────────────

const auditRouter = router({
  save: publicProcedure
    .input(
      z.object({
        sessionId: z.string().max(64),
        scores: z.object({
          sales: z.number(),
          cash: z.number(),
          staff: z.number(),
          systems: z.number(),
          ownerBehaviour: z.number(),
        }),
        primaryBottleneck: z.string().max(64).optional(),
        moneyFrictionDetected: z.boolean().optional(),
        clientId: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await saveAuditResult({
        sessionId: input.sessionId,
        scores: input.scores,
        primaryBottleneck: input.primaryBottleneck ?? null,
        moneyFrictionDetected: input.moneyFrictionDetected ? 1 : 0,
        clientId: input.clientId ?? "keystone",
      });
      return { success: true };
    }),
});

// ─── Goals Router ─────────────────────────────────────────────────────────────

const goalsRouter = router({
  list: publicProcedure
    .input(z.object({ sessionId: z.string().max(64) }))
    .query(async ({ input }) => {
      return getGoalItems(input.sessionId);
    }),

  create: publicProcedure
    .input(
      z.object({
        sessionId: z.string().max(64),
        title: z.string().max(500),
        description: z.string().optional(),
        dimension: z.string().max(64).optional(),
        priority: z.enum(["high", "medium", "low"]).optional(),
        dueWeek: z.number().int().min(1).max(12).optional(),
        clientId: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { dbId } = await createGoalItem({
        sessionId: input.sessionId,
        title: input.title,
        description: input.description ?? null,
        dimension: input.dimension ?? null,
        priority: input.priority ?? "medium",
        dueWeek: input.dueWeek ?? null,
        clientId: input.clientId ?? "keystone",
      });
      return { success: true, dbId };
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["pending", "in_progress", "completed"]),
      })
    )
    .mutation(async ({ input }) => {
      await updateGoalItemStatusAndSyncSuggestion(input.id, input.status);
      return { success: true };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number().int(),
        priority: z.enum(["high", "medium", "low"]).optional(),
        metric: z
          .object({
            label: z.string().max(100),
            unit: z.string().max(30).optional(),
            start: z.number(),
            current: z.number(),
            target: z.number(),
          })
          .nullable()
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateGoalItem(input.id, { priority: input.priority, metric: input.metric });
      return { success: true };
    }),

  // FAST method's "Focus" step: AI picks the vital ~20% of the person's
  // current open goals, grounded in their real audit/blueprint/snapshot
  // data (via the same context the Business Coach uses). Requires sign-in
  // since it needs that context -- unlike the rest of this router, which
  // stays public for the pre-signup goalSessionId fallback.
  suggestFocus: protectedProcedure
    .input(z.object({ sessionId: z.string().max(64) }))
    .mutation(async ({ input, ctx }) => {
      const goals = await getGoalItems(input.sessionId);
      const openGoals = goals
        .filter((g) => g.status !== "completed")
        .map((g) => ({ id: g.id, title: g.title, dimension: g.dimension }));
      return suggestFocusGoals(ctx.user, openGoals);
    }),
});

// ─── Growth Spurt Audit Router ───────────────────────────────────────────────
// Public lead-qualification funnel for the "Keystone Business Group Growth
// Spurt" offer, served at /os/growth-spurt-audit with no login required.
// A single upsert mutation handles all three funnel stages (started ->
// completed -> contact), replacing the standalone page's direct Formspree,
// Slack webhook, and separate-Supabase-project calls with one in-app save
// plus a server-side owner email notification.

const growthSpurtRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        sessionId: z.string().min(1).max(64),
        stage: z.enum(["started", "completed", "contact"]),
        name: z.string().max(255).optional(),
        phone: z.string().max(30).optional(),
        email: z.string().max(320).optional(),
        businessName: z.string().max(255).optional(),
        // Honeypot field — real visitors never fill this in.
        website: z.string().max(255).optional(),
        category: z.string().max(64).optional(),
        severity: z.string().max(32).optional(),
        severityScore: z.number().int().min(1).max(10).optional(),
        symptoms: z.array(z.string()).optional(),
        answers: z.record(z.string(), z.string()).optional(),
        preferredContact: z.string().max(32).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Bot caught the honeypot field — silently accept but don't save or notify.
      if (input.website && input.website.trim().length > 0) {
        return { success: true };
      }

      const saved = await upsertGrowthSpurtAudit({
        sessionId: input.sessionId,
        stage: input.stage,
        name: input.name ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        businessName: input.businessName ?? null,
        website: input.website ?? null,
        category: input.category ?? null,
        severity: input.severity ?? null,
        severityScore: input.severityScore ?? null,
        symptoms: input.symptoms ?? null,
        answers: input.answers ?? null,
        preferredContact: input.preferredContact ?? null,
        notified: 0,
      });

      // Only notify the owner on the stages that matter — not on every
      // "started" (that would fire for everyone who opens the page), but
      // always when an audit completes or a contact request comes in.
      if (input.stage === "completed" || input.stage === "contact") {
        void (async () => {
          try {
            const heading =
              input.stage === "contact"
                ? `Growth Spurt — Contact Request: ${input.name ?? "Unknown"}`
                : `Growth Spurt — Audit Completed (${input.severity ?? "?"}): ${input.name ?? "Unknown"}`;
            const lines = [
              `Stage: ${input.stage}`,
              `Name: ${input.name ?? "—"}`,
              `Business: ${input.businessName ?? "—"}`,
              `Phone: ${input.phone ?? "—"}`,
              `Email: ${input.email ?? "—"}`,
            ];
            if (input.category) lines.push(`Bottleneck category: ${input.category}`);
            if (input.severity) lines.push(`Severity: ${input.severity} (${input.severityScore ?? "?"}/10)`);
            if (input.preferredContact) lines.push(`Preferred contact method: ${input.preferredContact}`);
            if (input.symptoms && input.symptoms.length > 0) {
              lines.push("", "Symptoms:", ...input.symptoms.map((s) => `- ${s}`));
            }
            await notifyOwner({ title: heading, content: lines.join("\n") });
            if (saved) {
              await upsertGrowthSpurtAudit({ ...saved, notified: 1 });
            }
          } catch (err) {
            console.error("[GrowthSpurt] Owner notification failed:", err);
          }
        })();
      }

      return { success: true };
    }),
});

// ─── Customer Inquiries Router (per-business) ────────────────────────────────
// Every subscriber's own inquiry/lead tracker for their business — separate
// from Keystone's own `leads`/`growthSpurt` data. Feeds the Dashboard
// Insights widget. Owners and their employees share the same business pool.

const inquiriesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getCustomerInquiries(businessOwnerId(ctx.user));
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        contact: z.string().max(255).optional(),
        source: z.string().max(128).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return createCustomerInquiry({
        ownerId: businessOwnerId(ctx.user),
        createdByUserId: ctx.user.id,
        name: input.name,
        contact: input.contact ?? null,
        source: input.source ?? null,
        notes: input.notes ?? null,
        status: "new",
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["new", "follow_up", "declined", "converted"]).optional(),
        notes: z.string().optional(),
        declinedReason: z.string().optional(),
        followUpDate: z.string().optional(), // YYYY-MM-DD
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...patch } = input;
      return updateCustomerInquiry(id, patch);
    }),
});

// ─── Invoices Router (per-business) ──────────────────────────────────────────

const invoicesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getInvoices(businessOwnerId(ctx.user));
  }),

  create: protectedProcedure
    .input(
      z.object({
        clientName: z.string().min(1).max(255),
        description: z.string().max(500).optional(),
        amount: z.number().positive(),
        issuedDate: z.string(), // YYYY-MM-DD
        dueDate: z.string().optional(),
        customerInquiryId: z.number().int().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return createInvoice({
        ownerId: businessOwnerId(ctx.user),
        createdByUserId: ctx.user.id,
        clientName: input.clientName,
        description: input.description ?? null,
        amount: input.amount.toFixed(2),
        status: "sent",
        issuedDate: input.issuedDate,
        dueDate: input.dueDate ?? null,
        customerInquiryId: input.customerInquiryId ?? null,
      });
    }),

  markStatus: protectedProcedure
    .input(z.object({ id: z.number().int(), status: z.enum(["sent", "paid", "overdue"]) }))
    .mutation(async ({ input }) => {
      const paidDate = input.status === "paid" ? new Date().toISOString().slice(0, 10) : undefined;
      return updateInvoiceStatus(input.id, input.status, paidDate);
    }),
});

// ─── Daily Tasks Router (owner "Today" view + employee filtered view) ───────

const tasksRouter = router({
  /** Owners get every task for the business; employees get only their own. */
  list: protectedProcedure.query(async ({ ctx }) => {
    const ownerId = businessOwnerId(ctx.user);
    if (ctx.user.businessRole === "employee") {
      return getDailyTasksForAssignee(ownerId, ctx.user.id);
    }
    return getDailyTasks(ownerId);
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        dueDate: z.string().optional(), // YYYY-MM-DD
        assignedToUserId: z.number().int().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return createDailyTask({
        ownerId: businessOwnerId(ctx.user),
        createdByUserId: ctx.user.id,
        assignedToUserId: input.assignedToUserId ?? null,
        title: input.title,
        description: input.description ?? null,
        dueDate: input.dueDate ?? null,
        status: "pending",
      });
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number().int(), status: z.enum(["pending", "in_progress", "completed"]) }))
    .mutation(async ({ input }) => {
      return updateDailyTaskStatus(input.id, input.status);
    }),

  delete: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    await deleteDailyTask(input.id);
    return { success: true };
  }),
});

// ─── Team Router (an owner's invited employees) ──────────────────────────────

const teamRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const ownerId = businessOwnerId(ctx.user);
    return getBusinessTeam(ownerId);
  }),

  listInvites: protectedProcedure.query(async ({ ctx }) => {
    // Only owners manage invites — an employee has no team of their own.
    if (ctx.user.businessRole === "employee") return [];
    return getInvitesForOwner(ctx.user.id);
  }),

  invite: protectedProcedure
    .input(z.object({ email: z.string().email().max(320) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.businessRole === "employee") {
        throw new Error("Only the business owner can invite teammates.");
      }
      const email = input.email.toLowerCase().trim();
      const invite = await createEmployeeInvite({ ownerId: ctx.user.id, email, status: "pending" });

      void (async () => {
        try {
          const signInUrl = "https://keystonebusinessgroup.co.za/os";
          await sendEmployeeInviteEmail({
            inviteeEmail: email,
            ownerName: ctx.user.name ?? "Your team",
            signInUrl,
          });
        } catch (err) {
          console.error("[Team] Invite email failed:", err);
        }
      })();

      return invite;
    }),
});

// ─── Dashboard Insights Router ───────────────────────────────────────────────
// Powers the owner's Insights widget: "X inquiries, Y declined, Z need
// follow-up, N invoices sent" — scoped to the signed-in business.

const dashboardRouter = router({
  insights: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(365).optional() }))
    .query(async ({ input, ctx }) => {
      const ownerId = businessOwnerId(ctx.user);
      const windowDays = input.days ?? 30;
      const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

      const [allInquiries, allInvoices] = await Promise.all([getCustomerInquiries(ownerId), getInvoices(ownerId)]);

      const periodInquiries = allInquiries.filter((i) => new Date(i.createdAt) >= cutoff);
      const periodInvoices = allInvoices.filter((inv) => new Date(inv.issuedDate) >= cutoff);

      const today = new Date().toISOString().slice(0, 10);

      return {
        windowDays,
        inquiriesTotal: periodInquiries.length,
        inquiriesDeclined: periodInquiries.filter((i) => i.status === "declined").length,
        inquiriesNeedFollowUp: allInquiries.filter(
          (i) => i.status === "follow_up" && (!i.followUpDate || i.followUpDate <= today)
        ).length,
        inquiriesConverted: periodInquiries.filter((i) => i.status === "converted").length,
        invoicesSent: periodInvoices.filter((inv) => inv.status === "sent" || inv.status === "overdue").length,
        invoicesPaid: periodInvoices.filter((inv) => inv.status === "paid").length,
        invoicesOverdue: allInvoices.filter((inv) => inv.status === "overdue").length,
        totalInvoicedAmount: periodInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0),
        totalPaidAmount: periodInvoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + Number(inv.amount), 0),
      };
    }),
});

// ─── Admin Router ────────────────────────────────────────────────────────────

const adminRouter = router({
  /**
   * Returns all leads enriched with their most recent audit result.
   * Also returns raw audit sessions for the Audit Sessions tab.
   * Protected: admin role only.
   */
  getLeads: adminProcedure.query(async () => {
    const [allLeads, allAudits] = await Promise.all([
      getAllLeadsAdmin(),
      getAllAuditResults(),
    ]);

    // Build a map: email -> most recent audit (audits ordered desc, so first match wins)
    // Leads don't store sessionId, so we correlate by matching the most recent audit
    // that was captured around the same time as the lead (within 1 hour).
    // Fallback: attach the globally most recent audit to leads with no match.
    const enrichedLeads = allLeads.map((lead) => {
      // Try to find an audit captured within 1 hour of the lead
      const leadTime = new Date(lead.createdAt).getTime();
      const matchedAudit = allAudits.find((a) => {
        const auditTime = new Date(a.createdAt).getTime();
        return Math.abs(auditTime - leadTime) < 60 * 60 * 1000;
      });
      return {
        ...lead,
        primaryBottleneck: matchedAudit?.primaryBottleneck ?? null,
        moneyFrictionDetected: matchedAudit?.moneyFrictionDetected ?? null,
        auditScores: matchedAudit?.scores ?? null,
      };
    });

    return {
      leads: enrichedLeads,
      audits: allAudits,
    };
  }),

  /** Returns all Growth Spurt audit funnel submissions. Protected: admin role only. */
  getGrowthSpurtAudits: adminProcedure.query(async () => {
    return getAllGrowthSpurtAudits();
  }),

  // ── Keystone's own client CRM — admin only, separate from subscriber data ──
  // Stages/routes mirror Sulette's real "Keystone deal" workflow, ported
  // from her existing DebtSuccess CRM so the pipeline feels identical.
  listClients: adminProcedure.query(async () => {
    return getAllKeystoneClients();
  }),

  getClientTerms: adminProcedure.input(z.object({ clientId: z.number().int() })).query(async ({ input }) => {
    return getTermsForClient(input.clientId);
  }),

  createClient: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        businessName: z.string().max(255).optional(),
        contact: z.string().max(255).optional(),
        stage: z.enum(KS_STAGES).optional(),
        assignedTo: z.enum(KS_DIRECTORS).optional(),
        route: z.enum(KS_ROUTES).optional(),
        bottleneck: z.string().optional(),
        value: z.number().optional(),
        source: z.string().max(128).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return createKeystoneClient({
        name: input.name,
        businessName: input.businessName ?? null,
        contact: input.contact ?? null,
        stage: input.stage ?? "Audit completed",
        assignedTo: input.assignedTo ?? "Sulette",
        route: input.route ?? "Delegation",
        bottleneck: input.bottleneck ?? null,
        value: input.value !== undefined ? input.value.toFixed(2) : null,
        source: input.source ?? null,
        notes: input.notes ?? null,
        createdByUserId: ctx.user.id,
      });
    }),

  updateClient: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().max(255).optional(),
        businessName: z.string().max(255).optional(),
        contact: z.string().max(255).optional(),
        stage: z.enum(KS_STAGES).optional(),
        assignedTo: z.enum(KS_DIRECTORS).optional(),
        route: z.enum(KS_ROUTES).optional(),
        bottleneck: z.string().optional(),
        discoveryDate: z.string().optional(),
        slaSentDate: z.string().optional(),
        slaSignedDate: z.string().optional(),
        cipcReceived: z.boolean().optional(),
        financialsReceived: z.boolean().optional(),
        baselineNetProfit: z.number().optional(),
        baselineAgreedDate: z.string().optional(),
        startDate: z.string().optional(),
        sharePct: z.number().int().optional(),
        termMonths: z.number().int().optional(),
        contractMonths: z.number().int().optional(),
        value: z.number().optional(),
        notes: z.string().optional(),
        declinedReason: z.string().optional(),
        lostReason: z.string().optional(),
        followUpDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, value, baselineNetProfit, ...rest } = input;
      return updateKeystoneClient(id, {
        ...rest,
        ...(value !== undefined ? { value: value.toFixed(2) } : {}),
        ...(baselineNetProfit !== undefined ? { baselineNetProfit: baselineNetProfit.toFixed(2) } : {}),
      });
    }),

  /** Records or updates one 3-month billing term's net profit / fee / payment for a deal. */
  recordClientTerm: adminProcedure
    .input(
      z.object({
        clientId: z.number().int(),
        termNumber: z.number().int(),
        netProfit: z.number().optional(),
        feeAmount: z.number().optional(),
        paidDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return upsertKeystoneClientTerm({
        clientId: input.clientId,
        termNumber: input.termNumber,
        netProfit: input.netProfit !== undefined ? input.netProfit.toFixed(2) : null,
        feeAmount: input.feeAmount !== undefined ? input.feeAmount.toFixed(2) : null,
        paidDate: input.paidDate ?? null,
      });
    }),
});

const coachRouter = router({
  chat: protectedProcedure
    .input(
      z.object({
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().min(1).max(4000),
            })
          )
          .min(1)
          .max(40),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const reply = await getCoachReply(input.history, ctx.user);
      return { reply };
    }),
});

// ─── Voice Input ────────────────────────────────────────────────────────────

const voiceRouter = router({
  transcribe: protectedProcedure
    .input(z.object({ audioBase64: z.string().min(1), mimeType: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return transcribeAudio(input);
    }),
});

// ─── Toolkit Progress Tracking ──────────────────────────────────────────────
// Persists toolkit completions (replacing sessionStorage), their suggested
// next actions, and a wins/learnings log against each.

const toolkitSubmissionsRouter = router({
  save: protectedProcedure
    .input(
      z.object({
        toolkitKey: z.string().min(1).max(64),
        inputData: z.record(z.string(), z.any()),
        resultSummary: z.record(z.string(), z.any()),
        suggestions: z.array(z.string().min(1)).max(20).optional(),
        // If provided, each suggestion also becomes a real, synced row in
        // the 90-Day Goal Dashboard instead of just a separate checklist.
        syncToGoals: z.object({ sessionId: z.string().max(64), dimension: z.string().max(64).optional() }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return saveToolkitSubmission(
        {
          userId: ctx.user.id,
          toolkitKey: input.toolkitKey,
          inputData: input.inputData,
          resultSummary: input.resultSummary,
        },
        input.suggestions,
        input.syncToGoals
      );
    }),

  history: protectedProcedure
    .input(z.object({ toolkitKey: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      return getToolkitSubmissionHistory(ctx.user.id, input.toolkitKey);
    }),

  listCompleted: protectedProcedure.query(async ({ ctx }) => {
    return getLatestSubmissionPerToolkit(ctx.user.id);
  }),
});

const suggestionsRouter = router({
  updateStatus: protectedProcedure
    .input(z.object({ id: z.number().int(), status: z.enum(["not_started", "in_progress", "done"]) }))
    .mutation(async ({ ctx, input }) => {
      await updateSuggestionStatus(input.id, ctx.user.id, input.status);
      return { success: true } as const;
    }),

  listByToolkit: protectedProcedure
    .input(z.object({ toolkitKey: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      return getSuggestionsByToolkit(ctx.user.id, input.toolkitKey);
    }),
});

const winsLearningsRouter = router({
  add: protectedProcedure
    .input(
      z.object({
        toolkitKey: z.string().min(1).max(64),
        submissionId: z.number().int().optional(),
        type: z.enum(["win", "learning"]),
        content: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await addWinLearning({
        userId: ctx.user.id,
        toolkitKey: input.toolkitKey,
        submissionId: input.submissionId ?? null,
        type: input.type,
        content: input.content,
      });
      return { success: true } as const;
    }),

  listByToolkit: protectedProcedure
    .input(z.object({ toolkitKey: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      return getWinsLearningsByToolkit(ctx.user.id, input.toolkitKey);
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  coach: coachRouter,
  voice: voiceRouter,
  toolkitSubmissions: toolkitSubmissionsRouter,
  suggestions: suggestionsRouter,
  winsLearnings: winsLearningsRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    // Session lives client-side in the Supabase SDK (localStorage). Signing out
    // is a client-side call to supabase.auth.signOut() — this endpoint is kept
    // as a no-op so existing frontend calls to trpc.auth.logout don't break.
    logout: publicProcedure.mutation(() => {
      return { success: true } as const;
    }),
  }),
  leads: leadsRouter,
  audit: auditRouter,
  goals: goalsRouter,
  growthSpurt: growthSpurtRouter,
  inquiries: inquiriesRouter,
  invoices: invoicesRouter,
  tasks: tasksRouter,
  team: teamRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
