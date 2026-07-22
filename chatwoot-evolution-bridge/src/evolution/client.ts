import type { Config } from "../config.js";
import { logger } from "../logger.js";

/**
 * Thin client for Evolution Go's REST API.
 *
 * Verified against evolution-foundation/evolution-go docs/swagger.yaml:
 *   POST /send/text   body: { number, text, ... }
 *   POST /send/media  body: { number, url, type, caption?, filename? }
 *
 * Auth is not described in the OpenAPI spec, so it is configurable: the global
 * API key is sent as `apikey` and the per-instance token as `token` (header
 * names overridable via env). Evolution Go resolves the instance from the token.
 */
export class EvolutionClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(private readonly cfg: Config) {
    this.baseUrl = cfg.EVOLUTION_URL.replace(/\/+$/, "");
    this.headers = { "Content-Type": "application/json" };
    if (cfg.EVOLUTION_API_KEY) {
      this.headers[cfg.EVOLUTION_API_KEY_HEADER] = cfg.EVOLUTION_API_KEY;
    }
    if (cfg.EVOLUTION_INSTANCE_TOKEN) {
      this.headers[cfg.EVOLUTION_INSTANCE_TOKEN_HEADER] = cfg.EVOLUTION_INSTANCE_TOKEN;
    }
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Evolution ${path} failed: ${res.status} ${text.slice(0, 500)}`);
    }
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { raw: text };
    }
  }

  /** Send a plain text message. `number` is digits (no @s.whatsapp.net). */
  async sendText(number: string, text: string): Promise<void> {
    await this.post("/send/text", { number, text });
    logger.debug("evolution.sendText ok", { number });
  }

  /**
   * Send a media message by URL.
   * `type` is one of image | video | audio | document (Evolution's field).
   */
  async sendMedia(params: {
    number: string;
    url: string;
    type: string;
    caption?: string;
    filename?: string;
  }): Promise<void> {
    await this.post("/send/media", {
      number: params.number,
      url: params.url,
      type: params.type,
      caption: params.caption,
      filename: params.filename,
    });
    logger.debug("evolution.sendMedia ok", { number: params.number, type: params.type });
  }
}
