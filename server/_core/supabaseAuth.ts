import { createClient } from "@supabase/supabase-js";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

// Server-side client using the service role key — only ever used in backend code.
export const supabaseAdmin = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function getBearerToken(req: Request): string | undefined {
  const header = req.headers["authorization"];
  if (!header || typeof header !== "string") return undefined;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return undefined;
  return token;
}

/**
 * Verifies the Supabase access token sent by the frontend (Authorization: Bearer <token>),
 * then ensures a matching row exists in our local `users` table (keyed by Supabase's user id,
 * stored in the `openId` column for minimal schema churn).
 */
export async function authenticateRequest(req: Request): Promise<User | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  const supabaseUser = data.user;

  // A brand-new user whose email matches a pending employee invite is
  // created as that owner's employee, not as a new "owner" (the default).
  // This only ever affects the FIRST insert — upsertUser deliberately
  // excludes businessRole/ownerId from its update path.
  let businessRole: "owner" | "employee" | undefined;
  let ownerId: number | undefined;
  let matchedInviteId: number | undefined;
  if (supabaseUser.email) {
    const invite = await db.getPendingInviteByEmail(supabaseUser.email.toLowerCase());
    if (invite) {
      businessRole = "employee";
      ownerId = invite.ownerId;
      matchedInviteId = invite.id;
    }
  }

  await db.upsertUser({
    openId: supabaseUser.id,
    name: (supabaseUser.user_metadata?.full_name as string | undefined) ?? null,
    email: supabaseUser.email ?? null,
    loginMethod: supabaseUser.app_metadata?.provider ?? "email",
    lastSignedIn: new Date(),
    businessRole,
    ownerId,
  });

  if (matchedInviteId !== undefined) {
    await db.acceptInvite(matchedInviteId);
  }

  const localUser = await db.getUserByOpenId(supabaseUser.id);
  return localUser ?? null;
}
