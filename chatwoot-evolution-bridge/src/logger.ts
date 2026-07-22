type Level = "debug" | "info" | "warn" | "error";

const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = order[(process.env.LOG_LEVEL as Level) ?? "info"] ?? order.info;

function emit(level: Level, msg: string, meta?: unknown): void {
  if (order[level] < threshold) return;
  const line: Record<string, unknown> = { level, msg };
  if (meta !== undefined) line.meta = meta;
  const stream = level === "error" || level === "warn" ? console.error : console.log;
  stream(JSON.stringify(line));
}

export const logger = {
  debug: (msg: string, meta?: unknown) => emit("debug", msg, meta),
  info: (msg: string, meta?: unknown) => emit("info", msg, meta),
  warn: (msg: string, meta?: unknown) => emit("warn", msg, meta),
  error: (msg: string, meta?: unknown) => emit("error", msg, meta),
};
