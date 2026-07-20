import type { Config } from "./config.js";
import { OmieApiError } from "./errors.js";

export class OmieClient {
  constructor(private readonly config: Config) {}

  async call<T = unknown>(
    endpoint: string,
    callName: string,
    param: object
  ): Promise<T> {
    const url = this.config.baseUrl.replace(/\/$/, "") + endpoint;
    const body = {
      call: callName,
      app_key: this.config.appKey,
      app_secret: this.config.appSecret,
      param: [param]
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    let parsed: unknown = undefined;
    let parseFailed = false;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parseFailed = true;
      }
    } else {
      parsed = {};
    }

    if (parsed && typeof parsed === "object" && "faultstring" in parsed) {
      const p = parsed as { faultstring?: unknown; faultcode?: unknown };
      throw new OmieApiError(
        res.status,
        String(p.faultcode ?? ""),
        String(p.faultstring ?? ""),
        endpoint
      );
    }

    if (!res.ok) {
      throw new OmieApiError(res.status, "HTTP", text || res.statusText, endpoint);
    }

    if (parseFailed) {
      throw new OmieApiError(res.status, "PARSE", "Unexpected non-JSON response from Omie", endpoint);
    }

    return (parsed ?? {}) as T;
  }
}
