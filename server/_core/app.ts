import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { registerLmsWebhook } from "../lmsWebhook";
import { appRouter } from "../routers";
import { createContext } from "./context";

/**
 * Builds the Express app with all API routes wired up, but without starting
 * a listener or serving static files — callers decide how to run it:
 *  - server/_core/index.ts: long-running local/traditional Node server
 *  - api/index.ts: Vercel serverless function (Vercel handles static files itself)
 */
export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerLmsWebhook(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  return app;
}
