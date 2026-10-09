import { z } from "zod";

/**
 * Hosted-build replacement for lib/server/claude.ts. Calls Claude through the
 * artifact runtime's `sample` capability (the viewer's own Claude account), so
 * no API key is needed. Same `generate()` signature as the server version.
 */

export const MODEL = "viewer";

export class AIError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

type Turn = { role: "user" | "assistant"; content: string | unknown };
type SampleFn = ((input: unknown, opts?: Record<string, unknown>) => Promise<{ text: string }>) & {
  json: <T>(input: unknown, opts?: Record<string, unknown>) => Promise<T>;
};

let samplePromise: Promise<SampleFn | null> | null = null;
function getSample(): Promise<SampleFn | null> {
  const w = window as unknown as { claude?: { use: (n: string) => Promise<SampleFn | null> } };
  if (!w.claude?.use) return Promise.resolve(null);
  samplePromise ??= w.claude.use("sample");
  return samplePromise;
}

const ERROR_COPY: Record<string, string> = {
  not_granted: "Lingora needs your permission to use Claude. Reload the page and choose Allow when asked.",
  sampling_disabled: "Claude isn't available for this account, so lessons can't be generated.",
  rate_limited: "You've hit Claude's usage limit for now. Wait a little, then try again.",
  session_expired: "Your Claude session expired. Sign in to Claude again, then reload.",
  refused: "Claude declined that request. Try a different one.",
  invalid_json: "Claude's answer came back in an unexpected format. Please try again.",
  prompt_too_large: "That request was too large. Try a shorter one.",
};

/** Fills fields the model left out with empty values, guided by the JSON schema. */
function fill(schema: Record<string, unknown> | undefined, value: unknown): unknown {
  if (!schema) return value;
  const type = schema.type as string | undefined;
  if (Array.isArray(schema.enum)) return (schema.enum as unknown[]).includes(value) ? value : schema.enum[0];
  if (type === "object") {
    const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
    const obj = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    const out: Record<string, unknown> = {};
    for (const [k, s] of Object.entries(props)) out[k] = fill(s, obj[k]);
    return out;
  }
  if (type === "array") return Array.isArray(value) ? value.map((v) => fill(schema.items as Record<string, unknown>, v)) : [];
  if (type === "string") return value == null ? "" : typeof value === "string" ? value : String(value);
  if (type === "boolean") return typeof value === "boolean" ? value : value === "true";
  if (type === "number" || type === "integer") return Number(value) || 0;
  return value;
}

interface GenerateOptions<S extends z.ZodType> {
  userId: string;
  system: string;
  messages: Turn[];
  schema: S;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  /** "quick" for short conversational work; "default" for lessons, plans and stories. */
  tier?: "quick" | "default";
}

export async function generate<S extends z.ZodType>({ system, messages, schema, effort = "medium", tier }: GenerateOptions<S>): Promise<z.infer<S>> {
  const sample = await getSample();
  if (!sample) throw new AIError("Open this page inside Claude to use the AI tutor.", 503);
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  const format = `Reply with ONLY one JSON value matching this JSON Schema (include every field; use "" or [] when a field doesn't apply):\n${JSON.stringify(jsonSchema)}`;
  const turns = messages.map((m) => ({ role: m.role, content: String(m.content) }));
  const input =
    turns.length === 1
      ? `${system}\n\n${turns[0].content}\n\n${format}`
      : [{ role: "user" as const, content: `${system}\n\n${format}\n\n(The conversation follows.)` }, ...turns];
  try {
    const raw = await sample.json(input, {
      modelTier: tier ?? (effort === "low" ? "quick" : "default"),
      cache: false,
    });
    const parsed = schema.safeParse(fill(jsonSchema, raw));
    if (!parsed.success) throw new AIError("Claude's answer came back in an unexpected format. Please try again.");
    return parsed.data;
  } catch (e) {
    if (e instanceof AIError) throw e;
    const code = (e as { code?: string })?.code ?? "upstream_error";
    throw new AIError(ERROR_COPY[code] ?? "Couldn't reach Claude just now. Please try again.", code === "rate_limited" ? 429 : 502);
  }
}
