import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, adminProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { createLead, saveAuditResult, getGoalItems, createGoalItem, updateGoalItemStatus, getAllLeadsAdmin, getAllAuditResults } from "./db";
import { sendLeadCaptureConfirmation, sendOwnerLeadNotification, sendWealthResetEnrolment } from "./email";
import { z } from "zod";

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
      await updateGoalItemStatus(input.id, input.status);
      return { success: true };
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
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
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
});

export type AppRouter = typeof appRouter;
