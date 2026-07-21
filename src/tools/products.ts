import { z } from "zod";
import type { OmieClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, toOmiePaging } from "../pagination.js";
import { successResponse, genericErrorResponse, isNoRecordsFault } from "../errors.js";

const ENDPOINT = "/geral/produtos/";

export function createProductsTools(client: OmieClient): ToolDefinition[] {
  return [
    {
      name: "products_list",
      config: {
        title: "List Products",
        description:
          "List products from Omie (ListarProdutos). Supports pagination via page/limit.",
        inputSchema: { ...paginationFields }
      },
      handler: async (input: { page?: number; limit?: number }) => {
        const paging = toOmiePaging(input);
        try {
          const data = await client.call(ENDPOINT, "ListarProdutos", paging);
          return successResponse(data);
        } catch (e) {
          if (isNoRecordsFault(e)) {
            return successResponse({
              pagina: paging.pagina,
              total_de_paginas: 0,
              total_de_registros: 0,
              registros: 0,
              produto_servico_cadastro: []
            });
          }
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "products_get",
      config: {
        title: "Get Product",
        description: "Get a single product by its Omie code (ConsultarProduto).",
        inputSchema: { codigo_produto: z.number().int().positive() }
      },
      handler: async (input: { codigo_produto: number }) => {
        try {
          const data = await client.call(ENDPOINT, "ConsultarProduto", {
            codigo_produto: input.codigo_produto
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
