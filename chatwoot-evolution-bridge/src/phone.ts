/** Keep only digits. */
export function digitsOnly(input: string | null | undefined): string {
  return (input ?? "").replace(/\D/g, "");
}

/**
 * Extract the phone number from a WhatsApp JID.
 * Examples: "5511999998888@s.whatsapp.net" -> "5511999998888",
 *           "5511999998888:12@s.whatsapp.net" -> "5511999998888".
 * Group JIDs ("...@g.us") are returned as-is (digits only) — callers decide.
 */
export function jidToNumber(jid: string | null | undefined): string {
  if (!jid) return "";
  const user = jid.split("@")[0] ?? "";
  return digitsOnly(user.split(":")[0]);
}

/** True for WhatsApp group JIDs, which the bridge does not forward. */
export function isGroupJid(jid: string | null | undefined): boolean {
  return typeof jid === "string" && jid.includes("@g.us");
}

/**
 * Normalize a Brazilian number to the canonical mobile form
 * 55 + DDD(2) + 9 + 8 digits (13 digits total).
 *
 * WhatsApp/Evolution sometimes deliver BR mobiles without the leading 9
 * (legacy 8-digit subscriber numbers). Chatwoot treats "5511988887777" and
 * "551188887777" as different contacts, so we insert the 9 when it is missing.
 *
 * Inputs are expected in international form (they come from WhatsApp JIDs or
 * Chatwoot E.164 numbers, which always carry a country code). We therefore only
 * act on numbers that start with the BR country code "55"; anything else is
 * returned unchanged, so foreign E.164 numbers are never mangled.
 */
export function normalizeBrazilNumber(raw: string): string {
  const n = digitsOnly(raw);
  if (!n) return n;

  if (n.startsWith("55")) {
    const rest = n.slice(2);
    // Expect DDD (2) + subscriber (8 or 9). Anything else: leave untouched.
    if (rest.length === 10 || rest.length === 11) {
      const ddd = rest.slice(0, 2);
      let sub = rest.slice(2);
      if (sub.length === 8 && /^[6-9]/.test(sub)) {
        sub = "9" + sub; // legacy mobile missing the 9th digit
      }
      return "55" + ddd + sub;
    }
  }
  return n;
}

/** Resolve the number to send to Chatwoot/Evolution, applying BR rules if enabled. */
export function toContactNumber(raw: string, normalizeBr: boolean): string {
  const n = digitsOnly(raw);
  return normalizeBr ? normalizeBrazilNumber(n) : n;
}

/** E.164 representation (with "+") for Chatwoot's phone_number field. */
export function toE164(raw: string, normalizeBr: boolean): string {
  const n = toContactNumber(raw, normalizeBr);
  return n ? `+${n}` : n;
}
