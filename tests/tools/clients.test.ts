import { describe, it, expect } from "vitest";
import { createClientsTools } from "../../src/tools/clients.js";
import { OmieApiError } from "../../src/errors.js";
import { mockClient } from "../helpers/mock-client.js";

describe("clients_list", () => {
  it("calls ListarClientes with pagination and no filter", async () => {
    const client = mockClient(async () => ({ clientes_cadastro: [] }));
    const tool = createClientsTools(client).find((t) => t.name === "clients_list")!;
    await tool.handler({});
    expect(client.call).toHaveBeenCalledWith("/geral/clientes/", "ListarClientes", {
      pagina: 1,
      registros_por_pagina: 50
    });
  });

  it("includes clientesFiltro when nome provided", async () => {
    const client = mockClient(async () => ({}));
    const tool = createClientsTools(client).find((t) => t.name === "clients_list")!;
    await tool.handler({ nome_fantasia: "Ocean" });
    expect(client.call).toHaveBeenCalledWith("/geral/clientes/", "ListarClientes", {
      pagina: 1,
      registros_por_pagina: 50,
      clientesFiltro: { nome_fantasia: "Ocean" }
    });
  });

  it("returns isError on API error", async () => {
    const client = mockClient(async () => {
      throw new OmieApiError(500, "X", "boom", "/geral/clientes/");
    });
    const tool = createClientsTools(client).find((t) => t.name === "clients_list")!;
    const res = await tool.handler({});
    expect(res.isError).toBe(true);
  });
});

describe("clients_get", () => {
  it("calls ConsultarCliente with codigo_cliente_omie", async () => {
    const client = mockClient(async () => ({ codigo_cliente_omie: 42 }));
    const tool = createClientsTools(client).find((t) => t.name === "clients_get")!;
    const res = await tool.handler({ codigo_cliente_omie: 42 });
    expect(client.call).toHaveBeenCalledWith("/geral/clientes/", "ConsultarCliente", {
      codigo_cliente_omie: 42
    });
    expect(JSON.parse(res.content[0].text)).toEqual({ codigo_cliente_omie: 42 });
  });
});
