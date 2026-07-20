import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../src/config.js";

const SAVED = { ...process.env };

describe("loadConfig", () => {
  beforeEach(() => {
    delete process.env.OMIE_APP_KEY;
    delete process.env.OMIE_APP_SECRET;
    delete process.env.OMIE_BASE_URL;
    delete process.env.LOG_LEVEL;
  });
  afterEach(() => {
    process.env = { ...SAVED };
  });

  it("loads required keys and applies defaults", () => {
    process.env.OMIE_APP_KEY = "k";
    process.env.OMIE_APP_SECRET = "s";
    const cfg = loadConfig();
    expect(cfg.appKey).toBe("k");
    expect(cfg.appSecret).toBe("s");
    expect(cfg.baseUrl).toBe("https://app.omie.com.br/api/v1");
    expect(cfg.logLevel).toBe("info");
  });

  it("throws when OMIE_APP_KEY missing", () => {
    process.env.OMIE_APP_SECRET = "s";
    expect(() => loadConfig()).toThrow(/OMIE_APP_KEY/);
  });

  it("throws when OMIE_APP_SECRET missing", () => {
    process.env.OMIE_APP_KEY = "k";
    expect(() => loadConfig()).toThrow(/OMIE_APP_SECRET/);
  });
});
