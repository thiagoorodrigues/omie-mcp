import { z } from "zod";

const ConfigSchema = z.object({
  appKey: z.string().min(1, "OMIE_APP_KEY must not be empty"),
  appSecret: z.string().min(1, "OMIE_APP_SECRET must not be empty"),
  baseUrl: z.string().url(),
  logLevel: z.enum(["debug", "info", "warn", "error"])
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const appKey = process.env.OMIE_APP_KEY;
  const appSecret = process.env.OMIE_APP_SECRET;

  if (!appKey) {
    throw new Error("Missing required environment variable: OMIE_APP_KEY");
  }
  if (!appSecret) {
    throw new Error("Missing required environment variable: OMIE_APP_SECRET");
  }

  const raw = {
    appKey,
    appSecret,
    baseUrl: process.env.OMIE_BASE_URL ?? "https://app.omie.com.br/api/v1",
    logLevel: process.env.LOG_LEVEL ?? "info"
  };

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const pathKey = issue.path.join(".");
    const envVarMap: Record<string, string> = {
      appKey: "OMIE_APP_KEY",
      appSecret: "OMIE_APP_SECRET",
      baseUrl: "OMIE_BASE_URL",
      logLevel: "LOG_LEVEL"
    };
    const envVar = envVarMap[pathKey] ?? pathKey;
    throw new Error(`Invalid config (${envVar}): ${issue.message}`);
  }
  return result.data;
}
