# omie-mcp

MCP server for the [Omie API](https://developer.omie.com.br/service-list/):
list products, list/consult clients, and create budgets (orçamentos).

## Tools

- `products_list` — list products (pagination: `page`, `limit`).
- `products_get` — get one product by `codigo_produto`.
- `clients_list` — list clients; optional filters `nome_fantasia`, `razao_social`, `cnpj_cpf`.
- `clients_get` — get one client by `codigo_cliente_omie`.
- `budget_create` — create an orçamento: `codigo_cliente` + `itens[]` (`codigo_produto`, `quantidade`, `valor_unitario`); optional `etapa` (default `"00"`), `codigo_pedido_integracao`.
- `budgets_list` — list budgets/orders; optional `filtrar_por_data_de`, `filtrar_por_data_ate` (dd/mm/yyyy).

## Setup

```bash
npm install
npm run build
npm test
```

Set credentials (Omie → app credentials):

```
OMIE_APP_KEY=...
OMIE_APP_SECRET=...
```

## Use with Claude Desktop / Claude Code

Add to your MCP config:

```json
{
  "mcpServers": {
    "omie": {
      "command": "node",
      "args": ["/Users/thiagorodrigues/Projetos/omie-mcp/dist/index.js"],
      "env": {
        "OMIE_APP_KEY": "your-key",
        "OMIE_APP_SECRET": "your-secret"
      }
    }
  }
}
```
