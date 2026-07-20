import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OmieClient } from "../client.js";
import { registerTools } from "./register.js";
import { createProductsTools } from "./products.js";
import { createClientsTools } from "./clients.js";
import { createBudgetsTools } from "./budgets.js";

export function registerAllTools(server: McpServer, client: OmieClient): void {
  registerTools(server, [
    ...createProductsTools(client),
    ...createClientsTools(client),
    ...createBudgetsTools(client)
  ]);
}
