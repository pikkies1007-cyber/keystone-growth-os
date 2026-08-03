/**
 * server/email.test.ts
 *
 * Validates:
 * 1. The email helper module exports the expected functions
 * 2. The Resend API key is present in the environment
 * 3. A test email can be sent to Resend's official test address (delivered@resend.dev)
 *    without errors — this validates the API key is accepted by Resend
 */

import { describe, it, expect } from "vitest";
import {
  sendLeadCaptureConfirmation,
  sendWealthResetEnrolment,
  sendOwnerLeadNotification,
} from "./email";

describe("email helpers", () => {
  it("exports the three expected email functions", () => {
    expect(typeof sendLeadCaptureConfirmation).toBe("function");
    expect(typeof sendWealthResetEnrolment).toBe("function");
    expect(typeof sendOwnerLeadNotification).toBe("function");
  });

  it("RESEND_API_KEY is present in the environment", () => {
    expect(process.env.RESEND_API_KEY).toBeTruthy();
    expect(process.env.RESEND_API_KEY!.startsWith("re_")).toBe(true);
  });

  it("RESEND_OWNER_EMAIL is present in the environment", () => {
    expect(process.env.RESEND_OWNER_EMAIL).toBeTruthy();
    expect(process.env.RESEND_OWNER_EMAIL).toContain("@");
  });

  it(
    "sends a lead capture confirmation to Resend test address without error",
    async () => {
      // Resend's official test address — always delivers, never bounces
      const result = await sendLeadCaptureConfirmation({
        name: "Test User",
        email: "delivered@resend.dev",
        archetype: "hustler",
        archetypeScore: 72,
      });
      // sendLeadCaptureConfirmation returns void — if it throws, the test fails
      expect(result).toBeUndefined();
    },
    15_000 // allow up to 15s for the API call
  );

  it(
    "sends a Wealth Reset enrolment email to Resend test address without error",
    async () => {
      const result = await sendWealthResetEnrolment({
        name: "Test User",
        email: "delivered@resend.dev",
        archetype: "giver",
      });
      expect(result).toBeUndefined();
    },
    15_000
  );
});
