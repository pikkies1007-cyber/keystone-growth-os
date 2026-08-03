/**
 * Academy LMS Webhook Receiver
 * POST /api/lms-enrolment
 *
 * Academy LMS sends a JSON payload when a "New Enroll" event fires.
 * This handler:
 *   1. Stores the enrolment record in the database
 *   2. Notifies the owner with full student context + congratulations email text
 *      (owner can forward the email text via WhatsApp voice note or email manually
 *       until a dedicated email service such as Resend is configured)
 *
 * Academy LMS payload shape (New Enroll event):
 * {
 *   event: "new_enroll",
 *   student: { id, name, email },
 *   course: { id, title },
 *   enrolled_at: "2025-01-01T00:00:00Z"
 * }
 */

import type { Express, Request, Response } from "express";
import { createLmsEnrolment } from "./db";
import { notifyOwner } from "./_core/notification";

// ─── Congratulations email template ──────────────────────────────────────────
// This text is included in the owner notification so it can be forwarded
// to the student manually until a dedicated email service is configured.

function buildCongratulationsEmailText(params: {
  studentName: string;
  courseTitle: string;
  moneyArchetype?: string | null;
  primaryBottleneck?: string | null;
}): string {
  const { studentName, courseTitle, moneyArchetype, primaryBottleneck } = params;

  const archetypeContext = moneyArchetype
    ? `\n\nYour Money Identity profile — ${moneyArchetype.charAt(0).toUpperCase() + moneyArchetype.slice(1)} — means you already have a foundation to build on. The next 21 days will help you understand the patterns underneath it.`
    : "";

  const bottleneckContext = primaryBottleneck
    ? `\n\nYou identified ${primaryBottleneck.replace(/_/g, " ")} as your current business constraint. What you are about to explore will give you a deeper understanding of why that constraint keeps showing up.`
    : "";

  return `Hi ${studentName || "there"},

You have just taken one of the most important steps a business owner can take — not just for your business, but for yourself.

Your enrolment in ${courseTitle} is confirmed.${archetypeContext}${bottleneckContext}

Here is what to do right now:
1. Log in to the Gentle Wind Coaching platform and start Day 1 today — momentum matters more than perfection.
2. Keep a journal nearby. The insights that come up in the first week are often the most important ones.
3. Trust the process. What you discover about yourself will directly change how you run your business.

You made a decision most business owners never make. That already sets you apart.

With you on this journey,
The Keystone Growth OS Team`;
}

// ─── Route registration ───────────────────────────────────────────────────────

export function registerLmsWebhook(app: Express) {
  app.post("/api/lms-enrolment", async (req: Request, res: Response) => {
    try {
      const payload = req.body;

      // Academy LMS sends the payload in various shapes depending on version.
      // We normalise the fields defensively.
      const studentName: string =
        payload?.student?.name ||
        payload?.student_name ||
        payload?.user?.name ||
        "";

      const studentEmail: string =
        payload?.student?.email ||
        payload?.student_email ||
        payload?.user?.email ||
        payload?.email ||
        "";

      const courseTitle: string =
        payload?.course?.title ||
        payload?.course_title ||
        payload?.post_title ||
        "21-Day Wealth Reset";

      const courseId: string =
        String(payload?.course?.id || payload?.course_id || payload?.post_id || "");

      if (!studentEmail) {
        console.warn("[LMS Webhook] Received payload with no student email:", JSON.stringify(payload));
        // Return 200 so Academy LMS does not retry — we just log and skip
        return res.status(200).json({ received: true, processed: false, reason: "no_email" });
      }

      console.log(`[LMS Webhook] New enrolment: ${studentName} <${studentEmail}> → ${courseTitle}`);

      // ── 1. Store enrolment record ──────────────────────────────────────────
      let ownerNotified = 0;

      try {
        await createLmsEnrolment({
          studentName: studentName || null,
          studentEmail,
          courseTitle: courseTitle || null,
          courseId: courseId || null,
          moneyArchetype: null,   // Cannot be known at webhook time (no session link yet)
          primaryBottleneck: null,
          emailSent: 0,
          ownerNotified: 0,
          rawPayload: payload,
        });
      } catch (dbErr) {
        console.error("[LMS Webhook] Failed to save enrolment to DB:", dbErr);
        // Non-fatal — continue with notifications
      }

      // ── 2. Notify owner with full context + email text to forward ──────────
      try {
        const congratsText = buildCongratulationsEmailText({
          studentName,
          courseTitle,
        });

        const ownerMessage = [
          `New Wealth Reset Enrolment`,
          ``,
          `Student: ${studentName || "Unknown"}`,
          `Email: ${studentEmail}`,
          `Course: ${courseTitle}`,
          ``,
          `ACTION: Send a personalised voice note to ${studentName || "this student"} within 24 hours.`,
          ``,
          `--- CONGRATULATIONS EMAIL TO FORWARD TO STUDENT ---`,
          `Subject: You are in — ${courseTitle}`,
          ``,
          congratsText,
          `--- END ---`,
        ].join("\n");

        const notified = await notifyOwner({
          title: `New Enrolment: ${studentName || studentEmail}`,
          content: ownerMessage,
        });
        ownerNotified = notified ? 1 : 0;
      } catch (notifyErr) {
        console.error("[LMS Webhook] Owner notification failed:", notifyErr);
      }

      console.log(`[LMS Webhook] Processed: ownerNotified=${ownerNotified}`);

      return res.status(200).json({
        received: true,
        processed: true,
        ownerNotified: ownerNotified === 1,
      });
    } catch (err) {
      console.error("[LMS Webhook] Unhandled error:", err);
      // Return 200 to prevent Academy LMS from retrying indefinitely
      return res.status(200).json({ received: true, processed: false, reason: "internal_error" });
    }
  });

  console.log("[LMS Webhook] Registered: POST /api/lms-enrolment");
}
