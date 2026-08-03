import { TRPCError } from "@trpc/server";
import { Resend } from "resend";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Notification title is required." });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Notification content is required." });
  }

  const title = input.title.trim();
  const content = input.content.trim();

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.` });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.` });
  }

  return { title, content };
};

/**
 * Sends an owner notification by email via Resend. This previously went through
 * Manus's push-notification service (no browser/mobile equivalent exists outside
 * Manus), so email is the direct replacement. Returns `true` if sent, `false` if
 * Resend isn't configured or the send failed — callers already treat this as a
 * best-effort, fire-and-forget call.
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  if (!ENV.resendApiKey || !ENV.resendOwnerEmail) {
    console.warn("[Notification] RESEND_API_KEY or RESEND_OWNER_EMAIL not set — skipping owner notification.");
    return false;
  }

  try {
    const resend = new Resend(ENV.resendApiKey);
    const { error } = await resend.emails.send({
      from: ENV.resendFromAddress,
      to: ENV.resendOwnerEmail,
      subject: title,
      text: content,
    });
    if (error) {
      console.warn("[Notification] Resend failed to send owner notification:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error sending owner notification:", error);
    return false;
  }
}
