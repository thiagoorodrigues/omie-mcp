import { describe, it, expect, vi, afterEach } from "vitest";
import { createLogger } from "../src/logger.js";

describe("createLogger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("suppresses messages below threshold", () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const logger = createLogger("warn");
    logger.info("hidden");
    logger.error("shown");
    const calls = spy.mock.calls.map((c) => String(c[0])).join("");
    expect(calls).not.toContain("hidden");
    expect(calls).toContain("shown");
  });
});
