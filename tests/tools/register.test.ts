import { describe, it, expect, vi } from "vitest";
import { registerTools } from "../../src/tools/register.js";
import type { ToolDefinition } from "../../src/tools/types.js";

describe("registerTools", () => {
  it("registers every tool on the server", () => {
    const registerTool = vi.fn();
    const server = { registerTool } as any;
    const tools: ToolDefinition[] = [
      { name: "a", config: { title: "A", description: "d" }, handler: async () => ({ content: [] }) },
      { name: "b", config: { title: "B", description: "d" }, handler: async () => ({ content: [] }) }
    ];
    registerTools(server, tools);
    expect(registerTool).toHaveBeenCalledTimes(2);
    expect(registerTool).toHaveBeenCalledWith("a", tools[0].config, tools[0].handler);
  });
});
