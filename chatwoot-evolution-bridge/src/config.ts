import { z } from "zod";

const boolish = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? def : /^(1|true|yes|on)$/i.test(v)));

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  BRIDGE_WEBHOOK_TOKEN: z.string().optional().transform((v) => v || undefined),

  CHATWOOT_URL: z.string().url(),
  CHATWOOT_ACCOUNT_ID: z.string().min(1),
  CHATWOOT_API_TOKEN: z.string().min(1),
  CHATWOOT_INBOX_ID: z.coerce.number().int().positive(),

  EVOLUTION_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().optional().transform((v) => v || undefined),
  EVOLUTION_INSTANCE_TOKEN: z.string().optional().transform((v) => v || undefined),
  EVOLUTION_API_KEY_HEADER: z.string().default("apikey"),
  EVOLUTION_INSTANCE_TOKEN_HEADER: z.string().default("token"),

  NORMALIZE_BR_NUMBERS: boolish(true),
  DEDUPE_TTL_MS: z.coerce.number().int().nonnegative().default(300_000),
});

export type Config = z.infer<typeof schema>;

/** Parse config from an env-like object. Throws a readable error on invalid input. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  return parsed.data;
}
