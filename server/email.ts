/**
 * server/email.ts
 * Transactional email helper using Resend.
 *
 * Three email types:
 *  1. sendLeadCaptureConfirmation  — to user after Money Identity Checkpoint
 *  2. sendWealthResetEnrolment     — to user after 21-Day Wealth Reset enrolment
 *  3. sendOwnerLeadNotification    — to owner when a new lead is captured
 *
 * Email failures are logged but NEVER thrown — they must not block the
 * lead capture or enrolment flows.
 */

import { Resend } from "resend";
import { ENV } from "./_core/env";

// ─── Client ───────────────────────────────────────────────────────────────────

function getResend(): Resend | null {
  if (!ENV.resendApiKey) {
    console.warn("[email] RESEND_API_KEY not set — emails will be skipped.");
    return null;
  }
  return new Resend(ENV.resendApiKey);
}

// ─── Archetype display helpers ────────────────────────────────────────────────

const ARCHETYPE_LABELS: Record<string, string> = {
  hustler: "The Hustler",
  giver: "The Giver",
  protector: "The Protector",
  enjoyer: "The Enjoyer",
};

const ARCHETYPE_COLORS: Record<string, string> = {
  hustler: "#e05c3a",
  giver: "#3aad7a",
  protector: "#3a7aad",
  enjoyer: "#ad8c3a",
};

const ARCHETYPE_DESCRIPTIONS: Record<string, string> = {
  hustler:
    "You are wired to work hard and push through. Your next step is learning to work smarter — not just longer.",
  giver:
    "You give generously but often undercharge and overdeliver. Your next step is building boundaries that protect your business.",
  protector:
    "You are cautious and careful — a strength that can become a bottleneck. Your next step is building confidence in calculated risk.",
  enjoyer:
    "You live fully and spend freely. Your next step is building systems that fund the life you love without the stress.",
};

// ─── Shared layout ────────────────────────────────────────────────────────────

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Keystone Growth OS</title>
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#131920;border-radius:16px;border:1px solid #1e2d3d;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid #1e2d3d;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#2dd4a7;">KEYSTONE GROWTH OS</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #1e2d3d;">
              <p style="margin:0;font-size:11px;color:#4a5568;line-height:1.6;">
                You received this email because you used the Keystone Growth OS.<br/>
                <a href="https://keystonebusinessgroup.co.za" style="color:#2dd4a7;text-decoration:none;">keystonebusinessgroup.co.za</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── 1. Lead capture confirmation ─────────────────────────────────────────────

export interface LeadCaptureEmailParams {
  name: string;
  email: string;
  archetype: string | null;
  archetypeScore: number | null;
}

export async function sendLeadCaptureConfirmation(
  params: LeadCaptureEmailParams
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const { name, email, archetype, archetypeScore } = params;
  const firstName = name.split(" ")[0];
  const archetypeLabel = archetype ? (ARCHETYPE_LABELS[archetype] ?? archetype) : null;
  const archetypeColor = archetype ? (ARCHETYPE_COLORS[archetype] ?? "#2dd4a7") : "#2dd4a7";
  const archetypeDesc = archetype ? (ARCHETYPE_DESCRIPTIONS[archetype] ?? "") : "";

  const archetypeBlock = archetypeLabel
    ? `
      <div style="background:${archetypeColor}18;border:1px solid ${archetypeColor}30;border-radius:12px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${archetypeColor};">Your Money Identity</p>
        <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#e8edf2;">${archetypeLabel}${archetypeScore !== null ? ` — ${archetypeScore}% alignment` : ""}</p>
        <p style="margin:0;font-size:14px;color:#8899aa;line-height:1.6;">${archetypeDesc}</p>
      </div>`
    : "";

  const html = emailWrapper(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#e8edf2;line-height:1.3;">
      Welcome, ${firstName}.
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#8899aa;line-height:1.7;">
      You have taken the first step. Your Money Identity result is ready — and it is the foundation everything else in the OS is built on.
    </p>
    ${archetypeBlock}
    <p style="margin:0 0 24px;font-size:14px;color:#8899aa;line-height:1.7;">
      Your next step is the <strong style="color:#e8edf2;">Bottleneck Audit</strong> — a focused 8-minute diagnostic that identifies the single biggest constraint holding your business back right now.
    </p>
    <a href="https://keystonesys-n245sipm.manus.space/audit"
       style="display:inline-block;background:#2dd4a7;color:#0d1117;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.02em;">
      Start the Bottleneck Audit →
    </a>
    <p style="margin:28px 0 0;font-size:13px;color:#4a5568;line-height:1.6;">
      If you have any questions, reply to this email — we read every one.
    </p>
  `);

  const { error } = await resend.emails.send({
    from: ENV.resendFromAddress,
    to: [email],
    subject: `Your Money Identity result is ready, ${firstName}`,
    html,
    tags: [{ name: "type", value: "lead_capture" }],
  });

  if (error) {
    console.error("[email] sendLeadCaptureConfirmation failed:", error);
  } else {
    console.log(`[email] Lead capture confirmation sent to ${email}`);
  }
}

// ─── 2. Wealth Reset enrolment ────────────────────────────────────────────────

export interface WealthResetEmailParams {
  name: string;
  email: string;
  archetype: string | null;
}

export async function sendWealthResetEnrolment(
  params: WealthResetEmailParams
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const { name, email, archetype } = params;
  const firstName = name.split(" ")[0];
  const archetypeLabel = archetype ? (ARCHETYPE_LABELS[archetype] ?? archetype) : null;

  const html = emailWrapper(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#e8edf2;line-height:1.3;">
      You are in, ${firstName}.
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#8899aa;line-height:1.7;">
      Your 21-Day Wealth Reset journey starts now. This is not a course — it is a daily practice designed to rewire how you think about money, one small action at a time.
    </p>
    <div style="background:#1a2535;border:1px solid #1e2d3d;border-radius:12px;padding:20px;margin:0 0 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#2dd4a7;text-transform:uppercase;letter-spacing:0.08em;">What to expect</p>
      ${[
        ["Days 1–7", "Awareness — notice your money patterns without judgment"],
        ["Days 8–14", "Clarity — identify the one habit costing you the most"],
        ["Days 15–21", "Action — replace that habit with one small daily commitment"],
      ]
        .map(
          ([day, desc]) =>
            `<div style="display:flex;gap:12px;margin-bottom:10px;">
              <span style="font-size:12px;font-weight:700;color:#2dd4a7;white-space:nowrap;min-width:70px;">${day}</span>
              <span style="font-size:13px;color:#8899aa;line-height:1.5;">${desc}</span>
            </div>`
        )
        .join("")}
    </div>
    ${archetypeLabel ? `<p style="margin:0 0 20px;font-size:14px;color:#8899aa;line-height:1.7;">As <strong style="color:#e8edf2;">${archetypeLabel}</strong>, pay particular attention to the patterns that show up in your daily spending and saving decisions.</p>` : ""}
    <p style="margin:0 0 24px;font-size:14px;color:#8899aa;line-height:1.7;">
      Once you complete the 21 days, your <strong style="color:#e8edf2;">Pricing Toolkit</strong>, <strong style="color:#e8edf2;">Weekly Rhythm</strong>, and <strong style="color:#e8edf2;">12-Month Roadmap</strong> will unlock automatically in the OS.
    </p>
    <a href="https://keystonesys-n245sipm.manus.space/wealth-reset"
       style="display:inline-block;background:#2dd4a7;color:#0d1117;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.02em;">
      Return to the Wealth Reset →
    </a>
  `);

  const { error } = await resend.emails.send({
    from: ENV.resendFromAddress,
    to: [email],
    subject: `Your 21-Day Wealth Reset starts now, ${firstName}`,
    html,
    tags: [{ name: "type", value: "wealth_reset_enrolment" }],
  });

  if (error) {
    console.error("[email] sendWealthResetEnrolment failed:", error);
  } else {
    console.log(`[email] Wealth Reset enrolment email sent to ${email}`);
  }
}

// ─── 3. Owner lead notification ───────────────────────────────────────────────

export interface OwnerLeadNotificationParams {
  name: string;
  email: string;
  whatsapp: string | null;
  archetype: string | null;
  archetypeScore: number | null;
  primaryBottleneck: string | null;
}

export async function sendOwnerLeadNotification(
  params: OwnerLeadNotificationParams
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const ownerEmail = ENV.resendOwnerEmail;
  if (!ownerEmail) {
    console.warn("[email] RESEND_OWNER_EMAIL not set — owner notification skipped.");
    return;
  }

  const { name, email, whatsapp, archetype, archetypeScore, primaryBottleneck } = params;
  const archetypeLabel = archetype ? (ARCHETYPE_LABELS[archetype] ?? archetype) : "Not yet determined";
  const bottleneckLabel = primaryBottleneck
    ? primaryBottleneck.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
    : "Not yet determined";

  const rows = [
    ["Name", name],
    ["Email", `<a href="mailto:${email}" style="color:#2dd4a7;">${email}</a>`],
    ["WhatsApp", whatsapp ?? "—"],
    ["Money Identity", `${archetypeLabel}${archetypeScore !== null ? ` (${archetypeScore}%)` : ""}`],
    ["Primary Bottleneck", bottleneckLabel],
    ["Captured", new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })],
  ];

  const html = emailWrapper(`
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#2dd4a7;">New Lead Captured</p>
    <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#e8edf2;">${name}</h1>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e2d3d;font-size:12px;color:#4a5568;width:40%;vertical-align:top;">${label}</td>
          <td style="padding:10px 0;border-bottom:1px solid #1e2d3d;font-size:13px;color:#8899aa;vertical-align:top;">${value}</td>
        </tr>`
        )
        .join("")}
    </table>
    <div style="margin-top:24px;">
      <a href="https://keystonesys-n245sipm.manus.space/admin/leads"
         style="display:inline-block;background:#1e2d3d;color:#2dd4a7;font-size:13px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none;border:1px solid #2dd4a730;">
        View in Admin Dashboard →
      </a>
    </div>
  `);

  const { error } = await resend.emails.send({
    from: ENV.resendFromAddress,
    to: [ownerEmail],
    subject: `New lead: ${name} — ${archetypeLabel}`,
    html,
    tags: [{ name: "type", value: "owner_notification" }],
  });

  if (error) {
    console.error("[email] sendOwnerLeadNotification failed:", error);
  } else {
    console.log(`[email] Owner notification sent for lead: ${name}`);
  }
}
