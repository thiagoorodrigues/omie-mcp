import { describe, it, expect } from "vitest";
import {
  OmieApiError,
  successResponse,
  genericErrorResponse,
  isNoRecordsFault
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

  it("adds a rate-limit note when faultstring indicates a redundant call", () => {
    const err = new OmieApiError(
      500,
      "SOAP-ENV:Client-5",
      "Consumo redundante detectado",
      "/geral/produtos/"
    );
    const res = genericErrorResponse(err);
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("redundante");
    expect(res.content[0].text).toContain("consumo redundante / rate limit — retry later");
  });
});

describe("isNoRecordsFault", () => {
  it("detects the 5113 'no records' fault by code", () => {
    const err = new OmieApiError(
      500,
      "SOAP-ENV:Client-5113",
      "ERROR: Não existem registros para a página [1]!",
      "/produtos/pedido/"
    );
    expect(isNoRecordsFault(err)).toBe(true);
  });

  it("returns false for other OmieApiError faults", () => {
    const err = new OmieApiError(500, "SOAP-ENV:Client-101", "Cliente nao cadastrado", "/x");
    expect(isNoRecordsFault(err)).toBe(false);
  });

  it("returns false for non-OmieApiError errors", () => {
    expect(isNoRecordsFault(new Error("boom"))).toBe(false);
  });
});
