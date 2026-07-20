import { z } from "zod";
import type { OmieClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, toOmiePaging } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

const ENDPOINT = "/geral/clientes/";

export function createClientsTools(client: OmieClient): ToolDefinition[] {
  return [
    {
      name: "clients_list",
      config: {
        title: "List Clients",
        description:
          "List clients from Omie (ListarClientes). Supports pagination and optional filters by nome_fantasia, razao_social, or cnpj_cpf.",
        inputSchema: {
          ...paginationFields,
          nome_fantasia: z.string().min(1).optional(),
          razao_social: z.string().min(1).optional(),
          cnpj_cpf: z.string().min(1).optional()
        }
      },
      handler: async (input: {
        page?: number;
        limit?: number;
        nome_fantasia?: string;
        razao_social?: string;
        cnpj_cpf?: string;
      }) => {
        try {
          const param: Record<string, unknown> = { ...toOmiePaging(input) };
          const filtro: Record<string, string> = {};
          if (input.nome_fantasia) filtro.nome_fantasia = input.nome_fantasia;
          if (input.razao_social) filtro.razao_social = input.razao_social;
          if (input.cnpj_cpf) filtro.cnpj_cpf = input.cnpj_cpf;
          if (Object.keys(filtro).length > 0) param.clientesFiltro = filtro;

          const data = await client.call(ENDPOINT, "ListarClientes", param);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "clients_get",
      config: {
        title: "Get Client",
        description: "Get a single client by its Omie code (ConsultarCliente).",
        inputSchema: { codigo_cliente_omie: z.number().int().positive() }
      },
      handler: async (input: { codigo_cliente_omie: number }) => {
        try {
          const data = await client.call(ENDPOINT, "ConsultarCliente", {
            codigo_cliente_omie: input.codigo_cliente_omie
          });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
