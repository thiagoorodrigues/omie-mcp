export type McpToolResponse = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export class OmieApiError extends Error {
  constructor(
    public status: number,
    public faultcode: string,
    public faultstring: string,
    public endpoint: string
  ) {
    super(`Omie API error (${faultcode}) on ${endpoint}: ${faultstring}`);
    this.name = "OmieApiError";
  }
}

export function successResponse(data: unknown): McpToolResponse {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
  };
}

function apiErrorResponse(err: OmieApiError): McpToolResponse {
  const rateLimitNote = /redundante|redundant/i.test(err.faultstring)
    ? " (consumo redundante / rate limit — retry later)"
    : "";
  return {
    content: [
      {
        type: "text",
        text: `Omie API error (${err.faultcode}, status ${err.status}) on ${err.endpoint}${rateLimitNote}: ${err.faultstring}`
      }
    ],
    isError: true
  };
}

function networkErrorResponse(err: Error): McpToolResponse {
  return {
    content: [{ type: "text", text: `Network error: ${err.message}` }],
    isError: true
  };
}

export function genericErrorResponse(err: unknown): McpToolResponse {
  if (err instanceof OmieApiError) return apiErrorResponse(err);
  if (err instanceof Error) return networkErrorResponse(err);
  return networkErrorResponse(new Error(String(err)));
}

export function isNoRecordsFault(err: unknown): boolean {
  return (
    err instanceof OmieApiError &&
    (err.faultcode.includes("5113") ||
      /n[aã]o existem registros/i.test(err.faultstring))
  );
}
