import { describe, expect, it } from "vitest";
import { TtlSet } from "../src/dedupe.js";

describe("TtlSet", () => {
  it("reports a key as seen only after the first sighting", () => {
    let now = 1000;
    const set = new TtlSet(500, () => now);
    expect(set.seen("a")).toBe(false);
    expect(set.seen("a")).toBe(true);
  });

  it("forgets keys after the ttl elapses", () => {
    let now = 1000;
    const set = new TtlSet(500, () => now);
    set.add("a");
    now = 1400;
    expect(set.has("a")).toBe(true);
    now = 1600;
    expect(set.has("a")).toBe(false);
  });

  it("is a no-op when ttl is zero", () => {
    const set = new TtlSet(0, () => 1000);
    expect(set.seen("a")).toBe(false);
    expect(set.seen("a")).toBe(false);
    expect(set.size).toBe(0);
  });
});
