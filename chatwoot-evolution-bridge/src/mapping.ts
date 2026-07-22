import { digitsOnly, isGroupJid, jidToNumber } from "./phone.js";
import type { ChatwootWebhookPayload, InboundMessage } from "./types.js";

/**
 * Normalize an Evolution Go webhook body into a flat InboundMessage.
 *
 * NOTE: evolution-go's OpenAPI spec does not document the webhook payload, and
 * it is whatsmeow-based, so field locations vary by build/event. This function
 * is deliberately defensive: it probes several common shapes and returns null
 * when it cannot find a usable text message. The raw body is logged by the
 * route so you can adjust these paths to your instance once you see a real
 * event. Media is not mapped here yet (see route TODO).
 */
export function normalizeEvolutionInbound(body: any): InboundMessage | null {
  if (!body || typeof body !== "object") return null;

  // The message envelope may sit at a few well-known locations.
  const data = body.data ?? body.message ?? body.messages?.[0] ?? body;
  const key = data.key ?? data.Info ?? {};

  const remoteJid: string =
    key.remoteJid ?? key.RemoteJID ?? data.remoteJid ?? data.chat ?? data.from ?? "";

  const fromMe: boolean = Boolean(key.fromMe ?? key.FromMe ?? data.fromMe ?? false);
  const isGroup = isGroupJid(remoteJid) || Boolean(data.isGroup);

  const number = jidToNumber(remoteJid) || digitsOnly(data.number ?? data.sender);
  if (!number) return null;

  const text: string | undefined =
    data.message?.conversation ??
    data.message?.extendedTextMessage?.text ??
    data.text ??
    data.body ??
    data.conversation ??
    undefined;

  const messageId: string | undefined = key.id ?? key.ID ?? data.id ?? undefined;
  const pushName: string | undefined = data.pushName ?? data.pushname ?? data.notifyName ?? undefined;
  const event: string | undefined = body.event ?? body.type ?? undefined;

  return {
    number,
    pushName,
    text: typeof text === "string" ? text : undefined,
    messageId,
    fromMe,
    isGroup,
    event,
  };
}

/** Chatwoot sends message_type as string or int depending on context. */
export function isOutgoing(messageType: string | number | undefined): boolean {
  return messageType === "outgoing" || messageType === 1;
}

export interface ForwardDecision {
  forward: boolean;
  reason?: string;
}

/**
 * Decide whether a Chatwoot webhook event should be pushed to WhatsApp.
 * We only forward public, outgoing, agent-authored messages with content.
 */
export function shouldForwardChatwootMessage(payload: ChatwootWebhookPayload): ForwardDecision {
  if (payload.event !== "message_created") return { forward: false, reason: "not-message_created" };
  if (payload.private) return { forward: false, reason: "private-note" };
  if (!isOutgoing(payload.message_type)) return { forward: false, reason: "not-outgoing" };

  const hasText = typeof payload.content === "string" && payload.content.trim().length > 0;
  const hasAttachments = Array.isArray(payload.attachments) && payload.attachments.length > 0;
  if (!hasText && !hasAttachments) return { forward: false, reason: "empty" };

  return { forward: true };
}

/** Best-effort recipient number from a Chatwoot message_created payload. */
export function extractChatwootRecipient(payload: ChatwootWebhookPayload): string {
  const candidate =
    payload.conversation?.meta?.sender?.phone_number ??
    payload.conversation?.meta?.sender?.identifier ??
    payload.sender?.phone_number ??
    payload.contact?.phone_number ??
    "";
  return digitsOnly(candidate);
}
