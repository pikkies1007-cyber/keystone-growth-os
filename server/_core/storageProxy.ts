import type { Express } from "express";
import { ENV } from "./env";

/**
 * The original app referenced image assets (like the logo) at "/manus-storage/<key>",
 * a path Manus rewrote internally to its own storage backend. That backend doesn't
 * exist outside Manus, so this proxies the same paths to a public Supabase Storage
 * bucket instead — no changes needed anywhere the app references "/manus-storage/...".
 *
 * Setup required in Supabase: Storage → create a bucket named "assets", set it to
 * Public, then upload the original image files (e.g. keystone-logo-white_4f4fcec7.png)
 * to it, keeping the same filenames referenced in shared/brandConfig.ts.
 */
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.supabaseUrl) {
      res.status(500).send("Storage proxy not configured (SUPABASE_URL missing)");
      return;
    }

    const publicUrl = `${ENV.supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/assets/${key}`;
    res.set("Cache-Control", "public, max-age=3600");
    res.redirect(307, publicUrl);
  });
}
