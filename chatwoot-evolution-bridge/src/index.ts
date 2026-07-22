import express, { type NextFunction, type Request, type Response } from "express";
import { loadConfig } from "./config.js";
import { ChatwootClient } from "./chatwoot/client.js";
import { EvolutionClient } from "./evolution/client.js";
import { TtlSet } from "./dedupe.js";
import { logger } from "./logger.js";
import { evolutionWebhookRouter } from "./routes/evolutionWebhook.js";
import { chatwootWebhookRouter } from "./routes/chatwootWebhook.js";

export function createApp() {
  const cfg = loadConfig();
  const chatwoot = new ChatwootClient(cfg);
  const evolution = new EvolutionClient(cfg);
  const dedupe = new TtlSet(cfg.DEDUPE_TTL_MS);

  const app = express();
  app.use(express.json({ limit: "10mb" }));

  // Optional shared-secret guard for webhook endpoints.
  const guard = (req: Request, res: Response, next: NextFunction) => {
    if (!cfg.BRIDGE_WEBHOOK_TOKEN) return next();
    const provided = req.header("x-bridge-token") ?? req.query.token;
    if (provided !== cfg.BRIDGE_WEBHOOK_TOKEN) {
      return res.status(401).json({ error: "unauthorized" });
    }
    next();
  };

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/webhooks/evolution", guard, evolutionWebhookRouter({ cfg, chatwoot, dedupe }));
  app.use("/webhooks/chatwoot", guard, chatwootWebhookRouter({ cfg, evolution, dedupe }));

  return { app, cfg };
}

// Only start listening when run directly (not when imported by tests).
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  try {
    const { app, cfg } = createApp();
    app.listen(cfg.PORT, () => {
      logger.info(`bridge listening on :${cfg.PORT}`, {
        evolutionWebhook: "/webhooks/evolution",
        chatwootWebhook: "/webhooks/chatwoot",
      });
    });
  } catch (err) {
    logger.error("failed to start bridge", { error: (err as Error).message });
    process.exit(1);
  }
}
