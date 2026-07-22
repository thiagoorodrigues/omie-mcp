import { describe, expect, it } from "vitest";
import { digitsOnly, isGroupJid, jidToNumber, normalizeBrazilNumber, toE164 } from "../src/phone.js";

describe("digitsOnly", () => {
  it("strips non-digits", () => {
    expect(digitsOnly("+55 (11) 99999-8888")).toBe("5511999998888");
    expect(digitsOnly(null)).toBe("");
  });
});

describe("jidToNumber", () => {
  it("extracts the user part of a JID", () => {
    expect(jidToNumber("5511999998888@s.whatsapp.net")).toBe("5511999998888");
  });
  it("drops the device suffix", () => {
    expect(jidToNumber("5511999998888:12@s.whatsapp.net")).toBe("5511999998888");
  });
  it("handles empty input", () => {
    expect(jidToNumber(undefined)).toBe("");
  });
});

describe("isGroupJid", () => {
  it("detects group jids", () => {
    expect(isGroupJid("123456-789@g.us")).toBe(true);
    expect(isGroupJid("5511999998888@s.whatsapp.net")).toBe(false);
  });
});

describe("normalizeBrazilNumber", () => {
  it("inserts the 9th digit for legacy mobiles", () => {
    expect(normalizeBrazilNumber("551188887777")).toBe("5511988887777");
  });
  it("keeps numbers that already have the 9th digit", () => {
    expect(normalizeBrazilNumber("5511988887777")).toBe("5511988887777");
  });
  it("does not touch landline-style 8-digit numbers starting < 6", () => {
    expect(normalizeBrazilNumber("551133334444")).toBe("551133334444");
  });
  it("leaves bare national numbers (no country code) unchanged", () => {
    // Inputs are expected in international form; we do not guess a country code.
    expect(normalizeBrazilNumber("11988887777")).toBe("11988887777");
  });
  it("leaves non-BR E.164 numbers unchanged", () => {
    expect(normalizeBrazilNumber("12025550123")).toBe("12025550123");
  });
});

describe("toE164", () => {
  it("prefixes a plus when normalizing", () => {
    expect(toE164("551188887777", true)).toBe("+5511988887777");
  });
  it("respects the normalize flag being off", () => {
    expect(toE164("551188887777", false)).toBe("+551188887777");
  });
});
