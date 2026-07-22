import { Router } from "express";
import type { Config } from "../config.js";
import type { EvolutionClient } from "../evolution/client.js";
import type { TtlSet } from "../dedupe.js";
import { logger } from "../logger.js";
import { extractChatwootRecipient, shouldForwardChatwootMessage } from "../mapping.js";
import type { ChatwootAttachment, ChatwootWebhookPayload } from "../types.js";
import { toContactNumber } from "../phone.js";

/** Map Chatwoot's attachment file_type to Evolution's media `type`. */
function evolutionMediaType(fileType?: string): string {
  switch (fileType) {
    case "image":
      return "image";
    case "video":
      return "video";
    case "audio":
      return "audio";
    default:
      return "document";
  }
}

/**
 * Outbound: Chatwoot -> WhatsApp.
 * Point the API-channel inbox's Webhook URL here. We forward only public,
 * outgoing agent messages; incoming messages (the ones we pushed) are ignored.
 */
export function chatwootWebhookRouter(deps: {
  cfg: Config;
  evolution: EvolutionClient;
  dedupe: TtlSet;
}): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    res.status(200).json({ ok: true });

    try {
      const payload = req.body as ChatwootWebhookPayload;
      const decision = shouldForwardChatwootMessage(payload);
      if (!decision.forward) {
        logger.debug("chatwoot webhook: skipped", { reason: decision.reason, event: payload.event });
        return;
      }

      if (payload.id !== undefined && deps.dedupe.seen(`cw:${payload.id}`)) {
        logger.debug("chatwoot webhook: duplicate", { id: payload.id });
        return;
      }

      const recipient = extractChatwootRecipient(payload);
      if (!recipient) {
        logger.warn("chatwoot webhook: no recipient number found", { conversation: payload.conversation?.id });
        return;
      }
      const number = toContactNumber(recipient, deps.cfg.NORMALIZE_BR_NUMBERS);

      const text = (payload.content ?? "").trim();
      const attachments: ChatwootAttachment[] = payload.attachments ?? [];

      if (attachments.length > 0) {
        for (const att of attachments) {
          if (!att.data_url) continue;
          await deps.evolution.sendMedia({
            number,
            url: att.data_url,
            type: evolutionMediaType(att.file_type),
            caption: text || undefined,
            filename: att.file_name,
          });
        }
      } else if (text) {
        await deps.evolution.sendText(number, text);
      }

      logger.info("forwarded Chatwoot -> WhatsApp", { number });
    } catch (err) {
      logger.error("chatwoot webhook processing failed", { error: (err as Error).message });
    }
  });

  return router;
}
