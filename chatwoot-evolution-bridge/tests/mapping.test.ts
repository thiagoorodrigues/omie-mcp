import { describe, expect, it } from "vitest";
import {
  extractChatwootRecipient,
  isOutgoing,
  normalizeEvolutionInbound,
  shouldForwardChatwootMessage,
} from "../src/mapping.js";

describe("normalizeEvolutionInbound", () => {
  it("extracts a text message from a key/message envelope", () => {
    const msg = normalizeEvolutionInbound({
      event: "messages.upsert",
      data: {
        key: { remoteJid: "5511999998888@s.whatsapp.net", fromMe: false, id: "ABC123" },
        pushName: "Maria",
        message: { conversation: "Olá!" },
      },
    });
    expect(msg).toMatchObject({
      number: "5511999998888",
      text: "Olá!",
      pushName: "Maria",
      messageId: "ABC123",
      fromMe: false,
      isGroup: false,
    });
  });

  it("flags group messages", () => {
    const msg = normalizeEvolutionInbound({
      data: { key: { remoteJid: "123-456@g.us" }, message: { conversation: "hi" } },
    });
    expect(msg?.isGroup).toBe(true);
  });

  it("returns null when there is no number", () => {
    expect(normalizeEvolutionInbound({ data: {} })).toBeNull();
    expect(normalizeEvolutionInbound(null)).toBeNull();
  });

  it("reads extendedTextMessage text", () => {
    const msg = normalizeEvolutionInbound({
      data: {
        key: { remoteJid: "5511999998888@s.whatsapp.net" },
        message: { extendedTextMessage: { text: "link msg" } },
      },
    });
    expect(msg?.text).toBe("link msg");
  });
});

describe("isOutgoing", () => {
  it("accepts string and int forms", () => {
    expect(isOutgoing("outgoing")).toBe(true);
    expect(isOutgoing(1)).toBe(true);
    expect(isOutgoing("incoming")).toBe(false);
    expect(isOutgoing(0)).toBe(false);
  });
});

describe("shouldForwardChatwootMessage", () => {
  const base = { event: "message_created", message_type: "outgoing", content: "hi" } as const;

  it("forwards public outgoing messages with content", () => {
    expect(shouldForwardChatwootMessage({ ...base }).forward).toBe(true);
  });
  it("skips private notes", () => {
    expect(shouldForwardChatwootMessage({ ...base, private: true })).toMatchObject({ forward: false, reason: "private-note" });
  });
  it("skips incoming messages", () => {
    expect(shouldForwardChatwootMessage({ ...base, message_type: "incoming" })).toMatchObject({ forward: false, reason: "not-outgoing" });
  });
  it("skips non-message events", () => {
    expect(shouldForwardChatwootMessage({ ...base, event: "conversation_created" })).toMatchObject({ forward: false, reason: "not-message_created" });
  });
  it("skips empty messages without attachments", () => {
    expect(shouldForwardChatwootMessage({ ...base, content: "   " })).toMatchObject({ forward: false, reason: "empty" });
  });
  it("forwards attachment-only messages", () => {
    expect(shouldForwardChatwootMessage({ event: "message_created", message_type: "outgoing", content: "", attachments: [{ data_url: "http://x/y.jpg" }] }).forward).toBe(true);
  });
});

describe("extractChatwootRecipient", () => {
  it("prefers the conversation sender phone number", () => {
    const n = extractChatwootRecipient({
      conversation: { meta: { sender: { phone_number: "+5511999998888" } } },
    });
    expect(n).toBe("5511999998888");
  });
  it("falls back to contact phone number", () => {
    expect(extractChatwootRecipient({ contact: { phone_number: "+5511777776666" } })).toBe("5511777776666");
  });
  it("returns empty string when nothing is present", () => {
    expect(extractChatwootRecipient({})).toBe("");
  });
});
