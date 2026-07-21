import { describe, it, expect } from "vitest";
import { createProductsTools } from "../../src/tools/products.js";
import { OmieApiError } from "../../src/errors.js";
import { mockClient } from "../helpers/mock-client.js";

describe("products_list", () => {
  it("calls ListarProdutos with pagination defaults", async () => {
    const client = mockClient(async () => ({ produto_servico_cadastro: [] }));
    const tool = createProductsTools(client).find((t) => t.name === "products_list")!;
    await tool.handler({});
    expect(client.call).toHaveBeenCalledWith("/geral/produtos/", "ListarProdutos", {
      pagina: 1,
      registros_por_pagina: 50
    });
  });

  it("forwards page/limit", async () => {
    const client = mockClient(async () => ({}));
    const tool = createProductsTools(client).find((t) => t.name === "products_list")!;
    await tool.handler({ page: 2, limit: 10 });
    expect(client.call).toHaveBeenCalledWith("/geral/produtos/", "ListarProdutos", {
      pagina: 2,
      registros_por_pagina: 10
    });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => {
      throw new OmieApiError(500, "X", "boom", "/geral/produtos/");
    });
    const tool = createProductsTools(client).find((t) => t.name === "products_list")!;
    const res = await tool.handler({});
    expect(res.isError).toBe(true);
  });

  it("returns an empty envelope instead of isError when Omie reports no records (5113)", async () => {
    const client = mockClient(async () => {
      throw new OmieApiError(
        500,
        "SOAP-ENV:Client-5113",
        "ERROR: Não existem registros para a página [1]!",
        "/geral/produtos/"
      );
    });
    const tool = createProductsTools(client).find((t) => t.name === "products_list")!;
    const res = await tool.handler({});
    expect(res.isError).toBeFalsy();
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.total_de_registros).toBe(0);
    expect(parsed.produto_servico_cadastro).toEqual([]);
  });
});

describe("products_get", () => {
  it("calls ConsultarProduto with codigo_produto", async () => {
    const client = mockClient(async () => ({ codigo_produto: 7 }));
    const tool = createProductsTools(client).find((t) => t.name === "products_get")!;
    const res = await tool.handler({ codigo_produto: 7 });
    expect(client.call).toHaveBeenCalledWith("/geral/produtos/", "ConsultarProduto", {
      codigo_produto: 7
    });
    expect(JSON.parse(res.content[0].text)).toEqual({ codigo_produto: 7 });
  });
});
