import { z } from "zod";
import type { OmieClient } from "../client.js";
import type { ToolDefinition } from "./types.js";
import { paginationFields, toOmiePaging } from "../pagination.js";
import { successResponse, genericErrorResponse } from "../errors.js";

const ENDPOINT = "/produtos/pedido/";

const itemSchema = z.object({
  codigo_produto: z.number().int().positive(),
  quantidade: z.number().positive(),
  valor_unitario: z.number().nonnegative()
});

type Item = z.infer<typeof itemSchema>;

export function createBudgetsTools(client: OmieClient): ToolDefinition[] {
  return [
    {
      name: "budget_create",
      config: {
        title: "Create Budget",
        description:
          "Create a budget (orçamento) in Omie via IncluirPedido. Provide the client's Omie code and a list of items. Defaults to etapa '00' (orçamento); use '10' for a sales order.",
        inputSchema: {
          codigo_cliente: z.number().int().positive(),
          itens: z.array(itemSchema).min(1),
          etapa: z.string().min(1).optional().describe("Omie stage; '00' = orçamento (default), '10' = pedido de venda"),
          codigo_pedido_integracao: z.string().min(1).optional()
        }
      },
      handler: async (input: {
        codigo_cliente: number;
        itens: Item[];
        etapa?: string;
        codigo_pedido_integracao?: string;
      }) => {
        try {
          const cabecalho: Record<string, unknown> = {
            codigo_cliente: input.codigo_cliente,
            etapa: input.etapa ?? "00",
            quantidade_itens: input.itens.length
          };
          if (input.codigo_pedido_integracao) {
            cabecalho.codigo_pedido_integracao = input.codigo_pedido_integracao;
          }
          const det = input.itens.map((it) => ({
            produto: {
              codigo_produto: it.codigo_produto,
              quantidade: it.quantidade,
              valor_unitario: it.valor_unitario
            }
          }));
          const data = await client.call(ENDPOINT, "IncluirPedido", { cabecalho, det });
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    },
    {
      name: "budgets_list",
      config: {
        title: "List Budgets/Orders",
        description:
          "List budgets and sales orders from Omie (ListarPedidos). Supports pagination and optional date filters (dd/mm/yyyy).",
        inputSchema: {
          ...paginationFields,
          filtrar_por_data_de: z.string().min(1).optional(),
          filtrar_por_data_ate: z.string().min(1).optional()
        }
      },
      handler: async (input: {
        page?: number;
        limit?: number;
        filtrar_por_data_de?: string;
        filtrar_por_data_ate?: string;
      }) => {
        try {
          const param: Record<string, unknown> = { ...toOmiePaging(input) };
          if (input.filtrar_por_data_de) param.filtrar_por_data_de = input.filtrar_por_data_de;
          if (input.filtrar_por_data_ate) param.filtrar_por_data_ate = input.filtrar_por_data_ate;
          const data = await client.call(ENDPOINT, "ListarPedidos", param);
          return successResponse(data);
        } catch (e) {
          return genericErrorResponse(e);
        }
      }
    }
  ];
}
