import type { Config } from "../config.js";
import { logger } from "../logger.js";
import type { ChatwootApiContact } from "../types.js";

/**
 * Client for Chatwoot's Application API (agent access token).
 * Docs: https://www.chatwoot.com/developers/api/
 *
 * Flow used by the bridge for an inbound WhatsApp message:
 *   1. findOrCreateContact  -> contact id + contact_inbox source_id
 *   2. findOrCreateConversation(source_id) -> conversation id
 *   3. createIncomingMessage(conversation id, content)
 */
export class ChatwootClient {
  private readonly base: string;
  private readonly headers: Record<string, string>;

  constructor(private readonly cfg: Config) {
    this.base = `${cfg.CHATWOOT_URL.replace(/\/+$/, "")}/api/v1/accounts/${cfg.CHATWOOT_ACCOUNT_ID}`;
    this.headers = {
      "Content-Type": "application/json",
      api_access_token: cfg.CHATWOOT_API_TOKEN,
    };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: this.headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Chatwoot ${method} ${path} failed: ${res.status} ${text.slice(0, 500)}`);
    }
    return (text ? JSON.parse(text) : {}) as T;
  }

  private sourceIdFor(contact: ChatwootApiContact): string | undefined {
    const match = contact.contact_inboxes?.find((ci) => ci.inbox?.id === this.cfg.CHATWOOT_INBOX_ID);
    return match?.source_id;
  }

  /** Search an existing contact by phone/identifier. Returns the first hit. */
  private async searchContact(query: string): Promise<ChatwootApiContact | undefined> {
    const data = await this.request<{ payload?: ChatwootApiContact[] }>(
      "GET",
      `/contacts/search?q=${encodeURIComponent(query)}`,
    );
    return data.payload?.[0];
  }

  /** Ensure the contact has a contact_inbox for our inbox and return its source_id. */
  private async ensureContactInbox(contactId: number): Promise<string> {
    const created = await this.request<{ source_id?: string; payload?: { source_id?: string } }>(
      "POST",
      `/contacts/${contactId}/contact_inboxes`,
      { inbox_id: this.cfg.CHATWOOT_INBOX_ID },
    );
    const sourceId = created.source_id ?? created.payload?.source_id;
    if (!sourceId) throw new Error("Chatwoot did not return a source_id for the contact_inbox");
    return sourceId;
  }

  /**
   * Find a contact by number (identifier) or create one, returning the
   * contact id and the inbox-scoped source_id needed to open a conversation.
   */
  async findOrCreateContact(number: string, e164: string, name?: string): Promise<{ contactId: number; sourceId: string }> {
    const existing = (await this.searchContact(number)) ?? (await this.searchContact(e164));
    if (existing) {
      const sourceId = this.sourceIdFor(existing) ?? (await this.ensureContactInbox(existing.id));
      return { contactId: existing.id, sourceId };
    }

    const created = await this.request<{ payload?: { contact?: ChatwootApiContact } }>("POST", "/contacts", {
      inbox_id: this.cfg.CHATWOOT_INBOX_ID,
      name: name || number,
      phone_number: e164,
      identifier: number,
    });
    const contact = created.payload?.contact;
    if (!contact?.id) throw new Error("Chatwoot contact creation returned no id");
    const sourceId = this.sourceIdFor(contact) ?? (await this.ensureContactInbox(contact.id));
    return { contactId: contact.id, sourceId };
  }

  /** Reuse the latest non-resolved conversation for the contact, else create one. */
  async findOrCreateConversation(contactId: number, sourceId: string): Promise<number> {
    const list = await this.request<{ payload?: Array<{ id: number; status?: string; inbox_id?: number }> }>(
      "GET",
      `/contacts/${contactId}/conversations`,
    );
    const open = list.payload
      ?.filter((c) => c.inbox_id === this.cfg.CHATWOOT_INBOX_ID && c.status !== "resolved")
      .sort((a, b) => b.id - a.id)[0];
    if (open) return open.id;

    const created = await this.request<{ id?: number }>("POST", "/conversations", {
      source_id: sourceId,
      inbox_id: this.cfg.CHATWOOT_INBOX_ID,
      contact_id: contactId,
    });
    if (!created.id) throw new Error("Chatwoot conversation creation returned no id");
    return created.id;
  }

  /** Append an incoming (customer) message to a conversation. */
  async createIncomingMessage(conversationId: number, content: string): Promise<void> {
    await this.request("POST", `/conversations/${conversationId}/messages`, {
      content,
      message_type: "incoming",
    });
    logger.debug("chatwoot.createIncomingMessage ok", { conversationId });
  }

  /** Convenience: full inbound path from a WhatsApp message to a Chatwoot message. */
  async ingestIncoming(params: { number: string; e164: string; name?: string; content: string }): Promise<void> {
    const { contactId, sourceId } = await this.findOrCreateContact(params.number, params.e164, params.name);
    const conversationId = await this.findOrCreateConversation(contactId, sourceId);
    await this.createIncomingMessage(conversationId, params.content);
  }
}
