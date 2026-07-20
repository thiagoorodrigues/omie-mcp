import { describe, it, expect } from "vitest";
import { createBudgetsTools } from "../../src/tools/budgets.js";
import { OmieApiError } from "../../src/errors.js";
import { mockClient } from "../helpers/mock-client.js";

describe("budget_create", () => {
  it("builds IncluirPedido payload with etapa 00 by default", async () => {
    const client = mockClient(async () => ({ codigo_pedido: 999 }));
    const tool = createBudgetsTools(client).find((t) => t.name === "budget_create")!;
    await tool.handler({
      codigo_cliente: 123,
      itens: [{ codigo_produto: 1, quantidade: 2, valor_unitario: 10.5 }]
    });
    expect(client.call).toHaveBeenCalledWith("/produtos/pedido/", "IncluirPedido", {
      cabecalho: { codigo_cliente: 123, etapa: "00", quantidade_itens: 1 },
      det: [{ produto: { codigo_produto: 1, quantidade: 2, valor_unitario: 10.5 } }]
    });
  });

  it("honors custom etapa and codigo_pedido_integracao", async () => {
    const client = mockClient(async () => ({}));
    const tool = createBudgetsTools(client).find((t) => t.name === "budget_create")!;
    await tool.handler({
      codigo_cliente: 5,
      etapa: "10",
      codigo_pedido_integracao: "ext-1",
      itens: [{ codigo_produto: 2, quantidade: 1, valor_unitario: 3 }]
    });
    expect(client.call).toHaveBeenCalledWith("/produtos/pedido/", "IncluirPedido", {
      cabecalho: {
        codigo_cliente: 5,
        etapa: "10",
        quantidade_itens: 1,
        codigo_pedido_integracao: "ext-1"
      },
      det: [{ produto: { codigo_produto: 2, quantidade: 1, valor_unitario: 3 } }]
    });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => {
      throw new OmieApiError(500, "X", "boom", "/produtos/pedido/");
    });
    const tool = createBudgetsTools(client).find((t) => t.name === "budget_create")!;
    const res = await tool.handler({
      codigo_cliente: 1,
      itens: [{ codigo_produto: 1, quantidade: 1, valor_unitario: 1 }]
    });
    expect(res.isError).toBe(true);
  });
});

describe("budgets_list", () => {
  it("calls ListarPedidos with pagination defaults", async () => {
    const client = mockClient(async () => ({ pedido_venda_produto: [] }));
    const tool = createBudgetsTools(client).find((t) => t.name === "budgets_list")!;
    await tool.handler({});
    expect(client.call).toHaveBeenCalledWith("/produtos/pedido/", "ListarPedidos", {
      pagina: 1,
      registros_por_pagina: 50
    });
  });

  it("forwards date filters", async () => {
    const client = mockClient(async () => ({}));
    const tool = createBudgetsTools(client).find((t) => t.name === "budgets_list")!;
    await tool.handler({ filtrar_por_data_de: "01/07/2026", filtrar_por_data_ate: "20/07/2026" });
    expect(client.call).toHaveBeenCalledWith("/produtos/pedido/", "ListarPedidos", {
      pagina: 1,
      registros_por_pagina: 50,
      filtrar_por_data_de: "01/07/2026",
      filtrar_por_data_ate: "20/07/2026"
    });
  });
});
