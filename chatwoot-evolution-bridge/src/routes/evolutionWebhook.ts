import { Router } from "express";
import type { Config } from "../config.js";
import type { ChatwootClient } from "../chatwoot/client.js";
import type { TtlSet } from "../dedupe.js";
import { logger } from "../logger.js";
import { normalizeEvolutionInbound } from "../mapping.js";
import { toContactNumber, toE164 } from "../phone.js";

/**
 * Inbound: WhatsApp -> Chatwoot.
 * Configure Evolution Go to POST message events here (webhookUrl on
 * /instance/connect). We ignore our own echoes (fromMe), groups, and dupes.
 */
export function evolutionWebhookRouter(deps: {
  cfg: Config;
  chatwoot: ChatwootClient;
  dedupe: TtlSet;
}): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    // Ack fast so Evolution doesn't retry while we process.
    res.status(200).json({ ok: true });

    try {
      const msg = normalizeEvolutionInbound(req.body);
      if (!msg) {
        logger.debug("evolution webhook: no message extracted", { body: req.body });
        return;
      }
      if (msg.fromMe) return; // echo of an outbound message we sent
      if (msg.isGroup) return; // groups are not bridged
      if (!msg.text) {
        // TODO: media messages require /message/downloadmedia + Chatwoot
        // attachment upload. For now we log and skip non-text content.
        logger.info("evolution webhook: skipping non-text message", { event: msg.event, number: msg.number });
        return;
      }
      if (msg.messageId && deps.dedupe.seen(`wa:${msg.messageId}`)) {
        logger.debug("evolution webhook: duplicate", { messageId: msg.messageId });
        return;
      }

      const number = toContactNumber(msg.number, deps.cfg.NORMALIZE_BR_NUMBERS);
      const e164 = toE164(msg.number, deps.cfg.NORMALIZE_BR_NUMBERS);
      await deps.chatwoot.ingestIncoming({
        number,
        e164,
        name: msg.pushName,
        content: msg.text,
      });
      logger.info("forwarded WhatsApp -> Chatwoot", { number });
    } catch (err) {
      logger.error("evolution webhook processing failed", { error: (err as Error).message });
    }
  });

  return router;
}
