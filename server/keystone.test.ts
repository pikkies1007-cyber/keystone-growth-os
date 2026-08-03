import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers so tests don't need a real database ─────────────────────
vi.mock("./db", () => ({
  createLead: vi.fn().mockResolvedValue({ insertId: 1 }),
  saveAuditResult: vi.fn().mockResolvedValue({ insertId: 1 }),
  getGoalItems: vi.fn().mockResolvedValue([]),
  createGoalItem: vi.fn().mockResolvedValue({ dbId: 1 }),
  updateGoalItemStatus: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

// ─── Mock notification helper ─────────────────────────────────────────────────
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Lead Capture Tests ───────────────────────────────────────────────────────

describe("leads.capture", () => {
  it("accepts a valid lead with all fields", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.leads.capture({
      name: "Jane Dlamini",
      email: "jane@example.co.za",
      whatsapp: "+27821234567",
      moneyArchetype: "giver",
      archetypeScore: 72,
      diagnosticAnswers: { q1: 4, q2: 3, q3: 5, q4: 4 },
      source: "audit",
      clientId: "keystone",
    });
    expect(result).toEqual({ success: true });
  });

  it("accepts a minimal lead with only required fields", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.leads.capture({
      name: "Sipho Ndlovu",
      email: "sipho@shop.co.za",
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects an invalid email", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.leads.capture({ name: "Bad Email", email: "not-an-email" })
    ).rejects.toThrow();
  });

  it("rejects an empty name", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.leads.capture({ name: "", email: "valid@email.co.za" })
    ).rejects.toThrow();
  });

  it("accepts all four archetype values", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    for (const archetype of ["hustler", "giver", "protector", "enjoyer"] as const) {
      const result = await caller.leads.capture({
        name: "Test User",
        email: "test@keystone.co.za",
        moneyArchetype: archetype,
      });
      expect(result).toEqual({ success: true });
    }
  });

  it("rejects an invalid archetype value", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.leads.capture({
        name: "Test",
        email: "test@keystone.co.za",
        // @ts-expect-error intentional invalid value
        moneyArchetype: "spender",
      })
    ).rejects.toThrow();
  });
});

// ─── Audit Save Tests ─────────────────────────────────────────────────────────

describe("audit.save", () => {
  it("saves a complete audit result", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.audit.save({
      sessionId: "sess-abc123",
      scores: { sales: 6, cash: 8, staff: 5, systems: 7, ownerBehaviour: 9 },
      primaryBottleneck: "cash",
      moneyFrictionDetected: true,
      clientId: "keystone",
    });
    expect(result).toEqual({ success: true });
  });

  it("saves an audit result with minimal fields", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.audit.save({
      sessionId: "sess-minimal",
      scores: { sales: 5, cash: 5, staff: 5, systems: 5, ownerBehaviour: 5 },
    });
    expect(result).toEqual({ success: true });
  });
});

// ─── Goals Tests ──────────────────────────────────────────────────────────────

describe("goals.create", () => {
  it("creates a goal item with all fields", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.goals.create({
      sessionId: "sess-abc123",
      title: "Implement weekly cash flow review",
      description: "Review cash position every Monday morning",
      dimension: "cash",
      priority: "high",
      dueWeek: 2,
      clientId: "keystone",
    });
    expect(result).toMatchObject({ success: true, dbId: 1 });
  });
});

describe("goals.updateStatus", () => {
  it("updates a goal item status to completed", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.goals.updateStatus({ id: 1, status: "completed" });
    expect(result).toEqual({ success: true });
  });

  it("rejects an invalid status value", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.goals.updateStatus({
        id: 1,
        // @ts-expect-error intentional invalid value
        status: "archived",
      })
    ).rejects.toThrow();
  });
});

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { COOKIE_NAME } = await import("../shared/const");
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});
