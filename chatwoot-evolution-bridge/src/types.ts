/**
 * Minimal shapes for the payloads the bridge consumes. These are intentionally
 * loose (most fields optional) because both Chatwoot and Evolution Go evolve
 * their payloads and we only depend on a small, stable subset.
 */

// ---- Chatwoot outgoing webhook (message_created / message_updated) ----
export interface ChatwootContact {
  id?: number;
  name?: string;
  phone_number?: string;
  identifier?: string;
}

export interface ChatwootConversationMeta {
  sender?: ChatwootContact;
}

export interface ChatwootConversation {
  id?: number;
  meta?: ChatwootConversationMeta;
}

export interface ChatwootAttachment {
  file_type?: string; // image | audio | video | file
  data_url?: string;
  file_name?: string;
}

export interface ChatwootWebhookPayload {
  event?: string; // "message_created", ...
  id?: number; // message id
  content?: string | null;
  message_type?: string | number; // "incoming" | "outgoing" | 0 | 1
  private?: boolean;
  source_id?: string | null;
  conversation?: ChatwootConversation;
  sender?: ChatwootContact;
  contact?: ChatwootContact;
  inbox_id?: number;
  attachments?: ChatwootAttachment[];
}

// ---- Chatwoot application API responses (subset) ----
export interface ChatwootContactInbox {
  inbox?: { id?: number };
  source_id?: string;
}

export interface ChatwootApiContact {
  id: number;
  name?: string;
  phone_number?: string;
  identifier?: string;
  contact_inboxes?: ChatwootContactInbox[];
}

// ---- Evolution Go inbound webhook (normalized) ----
export interface InboundMessage {
  /** WhatsApp number (digits) of the remote party. */
  number: string;
  /** Best-effort display name. */
  pushName?: string;
  /** Text content, if any. */
  text?: string;
  /** Provider message id (for dedupe). */
  messageId?: string;
  /** True when the message was sent by us/the connected device. */
  fromMe: boolean;
  /** True for group chats (not forwarded). */
  isGroup: boolean;
  /** Raw event kind reported by Evolution, for logging. */
  event?: string;
}
