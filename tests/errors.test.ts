import { describe, it, expect } from "vitest";
import {
  OmieApiError,
  successResponse,
  genericErrorResponse
} from "../src/errors.js";

describe("successResponse", () => {
  it("wraps data as pretty JSON text", () => {
    const res = successResponse({ a: 1 });
    expect(res.isError).toBeUndefined();
    expect(JSON.parse(res.content[0].text)).toEqual({ a: 1 });
  });
});

describe("genericErrorResponse", () => {
  it("formats OmieApiError with faultstring", () => {
    const err = new OmieApiError(500, "SOAP-ENV:Client-101", "Cliente nao encontrado", "/geral/clientes/");
    const res = genericErrorResponse(err);
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("Cliente nao encontrado");
    expect(res.content[0].text).toContain("/geral/clientes/");
  });

  it("formats a plain Error as network error", () => {
    const res = genericErrorResponse(new Error("boom"));
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("boom");
  });
});
