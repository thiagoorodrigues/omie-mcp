import { describe, it, expect, vi, afterEach } from "vitest";
import { OmieClient } from "../src/client.js";
import { OmieApiError } from "../src/errors.js";
import type { Config } from "../src/config.js";

const config: Config = {
  appKey: "APPKEY",
  appSecret: "APPSECRET",
  baseUrl: "https://app.omie.com.br/api/v1",
  logLevel: "info"
};

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" }
    })
  );
}

describe("OmieClient.call", () => {
  afterEach(() => vi.restoreAllMocks());

  it("posts the JSON-RPC envelope with credentials and single-element param array", async () => {
    const fetchMock = mockFetch(200, { pagina: 1 });
    vi.stubGlobal("fetch", fetchMock);
    const client = new OmieClient(config);

    const out = await client.call("/geral/produtos/", "ListarProdutos", { pagina: 1 });

    expect(out).toEqual({ pagina: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://app.omie.com.br/api/v1/geral/produtos/");
    expect(init.method).toBe("POST");
    const sent = JSON.parse(init.body as string);
    expect(sent).toEqual({
      call: "ListarProdutos",
      app_key: "APPKEY",
      app_secret: "APPSECRET",
      param: [{ pagina: 1 }]
    });
  });

  it("throws OmieApiError when body has faultstring", async () => {
    const fetchMock = mockFetch(500, {
      faultstring: "Cliente nao cadastrado",
      faultcode: "SOAP-ENV:Client-101"
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new OmieClient(config);

    await expect(
      client.call("/geral/clientes/", "ConsultarCliente", { codigo_cliente_omie: 1 })
    ).rejects.toBeInstanceOf(OmieApiError);
  });

  it("throws OmieApiError on non-ok without faultstring", async () => {
    const fetchMock = mockFetch(404, "Not Found");
    vi.stubGlobal("fetch", fetchMock);
    const client = new OmieClient(config);

    await expect(
      client.call("/geral/produtos/", "ListarProdutos", {})
    ).rejects.toBeInstanceOf(OmieApiError);
  });

  it("throws OmieApiError when a 2xx response body is non-JSON", async () => {
    const fetchMock = mockFetch(200, "<html>Internal error page</html>");
    vi.stubGlobal("fetch", fetchMock);
    const client = new OmieClient(config);

    await expect(
      client.call("/geral/produtos/", "ListarProdutos", {})
    ).rejects.toBeInstanceOf(OmieApiError);
  });

  it("resolves to {} when a 2xx response body is empty", async () => {
    const fetchMock = mockFetch(200, "");
    vi.stubGlobal("fetch", fetchMock);
    const client = new OmieClient(config);

    const out = await client.call("/geral/produtos/", "ListarProdutos", {});

    expect(out).toEqual({});
  });
});
