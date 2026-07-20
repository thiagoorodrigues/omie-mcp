import { vi } from "vitest";
import type { OmieClient } from "../../src/client.js";

export function mockClient(
  callImpl: (endpoint: string, callName: string, param: object) => Promise<unknown>
): OmieClient {
  return {
    call: vi.fn(callImpl)
  } as unknown as OmieClient;
}
