import { describe, it, expect } from "vitest";
import { applyPaginationDefaults, toOmiePaging } from "../src/pagination.js";

describe("applyPaginationDefaults", () => {
  it("defaults to page 1 / limit 50", () => {
    expect(applyPaginationDefaults({})).toEqual({ page: 1, limit: 50 });
  });
  it("keeps provided values", () => {
    expect(applyPaginationDefaults({ page: 3, limit: 20 })).toEqual({ page: 3, limit: 20 });
  });
});

describe("toOmiePaging", () => {
  it("maps page/limit to pagina/registros_por_pagina", () => {
    expect(toOmiePaging({ page: 2, limit: 10 })).toEqual({
      pagina: 2,
      registros_por_pagina: 10
    });
  });
  it("applies defaults", () => {
    expect(toOmiePaging({})).toEqual({ pagina: 1, registros_por_pagina: 50 });
  });
});
