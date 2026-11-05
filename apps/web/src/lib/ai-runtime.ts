/**
 * Shared AI call + retry runtime. Encapsulates the patterns previously
 * scattered across meals/workout/weekly actions:
 *   1. Single text response call (optionally schema-constrained) with retries.
 *   2. Token aggregation across the initial call and any retries.
 *
 * Each feature defines its own retry strategy via RetryPlanStep[] — generic
 * "retry on parse fail" is intentionally NOT baked in because retry triggers
 * differ per feature (parse-fail vs content-gap vs truncation).
 */

import type Anthropic from "@anthropic-ai/sdk";
import { getAIClient, AI_MODELS, extractText } from "@/lib/ai";
import { categorizeWarnings, sampleWarnings } from "@/lib/ai-warning-telemetry";

export type AIModelKind = "fast" | "smart";

/** Effort levels. SDK 0.88's OutputConfig type predates "xhigh". */
export type AIEffort = "low" | "medium" | "high" | "xhigh" | "max";

interface BaseCallOptions {
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
  model?: AIModelKind;
  /** AbortController timeout in ms. Undefined = no timeout (SDK default). */
  timeoutMs?: number;
  /**
   * output_config.effort. Omit to send exactly the request callers have always
   * sent (model-default effort, non-streaming). Smart model only — Haiku 4.5
   * rejects the parameter with a 400.
   */
  effort?: AIEffort;
  /**
   * JSON schema for structured output (output_config.format) — the reply is
   * then guaranteed to parse and match it. See ai-output-schemas.
   */
  outputSchema?: Record<string, unknown>;
}

export interface AITextResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
  modelId: string;
}

function resolveModel(kind: AIModelKind | undefined): string {
  return (kind ?? "fast") === "smart" ? AI_MODELS.smart : AI_MODELS.fast;
}

function buildSystem(systemPrompt: string): Anthropic.Messages.TextBlockParam[] {
  return [
    {
      type: "text",
      text: systemPrompt,
      cache_control: { type: "ephemeral" },
    },
  ];
}

async function withOptionalTimeout<T>(
  timeoutMs: number | undefined,
  fn: (signal: AbortSignal | undefined) => Promise<T>,
): Promise<T> {
  if (timeoutMs == null) return fn(undefined);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fn(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

type EffortParam = NonNullable<
  Anthropic.Messages.MessageCreateParamsNonStreaming["output_config"]
>["effort"];

/**
 * Sends one request. Without `effort` this is the plain non-streaming
 * `messages.create` every caller has always used. With it the call goes over a
 * stream: high-effort requests can think for minutes and need a max_tokens
 * above the ~21k the SDK allows on non-streaming calls. finalMessage()
 * resolves to the same Message shape, so callers can't tell the difference.
 */
async function sendMessage(
  params: Anthropic.Messages.MessageCreateParamsNonStreaming,
  opts: Pick<BaseCallOptions, "effort" | "timeoutMs" | "outputSchema">,
): Promise<Anthropic.Messages.Message> {
  const client = getAIClient();
  const { effort, outputSchema } = opts;
  if (effort && params.model !== AI_MODELS.smart) {
    throw new Error(`effort is only supported on the smart model (got ${params.model})`);
  }
  const outputConfig = {
    ...(effort ? { effort: effort as EffortParam } : {}),
    ...(outputSchema ? { format: { type: "json_schema" as const, schema: outputSchema } } : {}),
  };
  const body = effort || outputSchema ? { ...params, output_config: outputConfig } : params;
  return withOptionalTimeout(opts.timeoutMs, (signal) => {
    const reqOpts = signal ? { signal } : undefined;
    if (!effort) return client.messages.create(body, reqOpts);
    return client.messages.stream(body, reqOpts).finalMessage();
  });
}

export async function callAIText(opts: BaseCallOptions): Promise<AITextResult> {
  const modelId = resolveModel(opts.model);
  const message = await sendMessage(
    {
      model: modelId,
      max_tokens: opts.maxTokens,
      system: buildSystem(opts.systemPrompt),
      messages: [{ role: "user", content: opts.userMessage }],
    },
    opts,
  );

  const text = extractText(message.content);
  return {
    text,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    stopReason: message.stop_reason ?? null,
    modelId,
  };
}

/**
 * One retry attempt definition. `buildRetryMessage` decides — based on the
 * latest result — whether to retry and what message addendum to send. Return
 * `null` to skip this step.
 */
export interface RetryPlanStep<TResult> {
  buildRetryMessage: (current: TResult, attempt: number) => string | null;
  /**
   * Whether to keep the retry's result over the previous one. Default: always
   * keep the retry (overwrite). Use this for content-quality retries that
   * should only replace when the new attempt has fewer gaps.
   */
  shouldKeep?: (previous: TResult, candidate: TResult) => boolean;
  /** Optional override for max_tokens on this retry. */
  maxTokens?: number;
  /** Optional override for timeoutMs on this retry. */
  timeoutMs?: number;
}

interface ExecuteOptions<TCallResult, TResult> {
  /** Initial call. Receives the original user message. */
  initial: () => Promise<TCallResult>;
  /** Retry call. Receives the original user message + retry addendum. */
  retry: (userMessageWithAddendum: string, step: RetryPlanStep<TResult>) => Promise<TCallResult>;
  /** Original user message (so retries can prepend it). Pass empty if you build retries differently. */
  userMessage: string;
  /** Parse + validate the raw call result into the domain TResult. Throws on parse failure. */
  consume: (raw: TCallResult) => TResult;
  /** Optional fallback if the *initial* `consume` throws. Lets parse-fail retries plug in. */
  onParseFailure?: () => Promise<{ result: TResult; raw: TCallResult }>;
  retries: RetryPlanStep<TResult>[];
  /** Optional gap scorer (lower = better); recorded as `initialScore`. */
  score?: (result: TResult) => number;
}

export interface ExecuteResult<TResult> {
  result: TResult;
  inputTokens: number;
  outputTokens: number;
  /** Total call count including the initial call and any retries. */
  attempts: number;
  /** Number of retries whose result was parse-failure (silently dropped). */
  retryParseFailures: number;
  /** Number of retries whose result was accepted (replaced current). */
  keptRetryCount: number;
  /** Retry steps whose buildRetryMessage returned null (no AI call). */
  skippedRetryCount: number;
  /** `score` of the result before any retry step — set when `score` is given. */
  initialScore?: number;
}

interface CallResultWithUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Generic retry orchestrator. Token aggregation is automatic.
 *
 * Flow:
 *   1. Run initial call → try consume.
 *      - On throw: run onParseFailure (if provided) and use its result.
 *   2. For each RetryPlanStep:
 *      - Ask `buildRetryMessage(currentResult)`. If null, skip.
 *      - Otherwise call `retry(userMessage + addendum, step)` and consume.
 *      - Tokens always accumulate (whether the retry's result is kept or not).
 *      - If `shouldKeep` is provided, only replace when it returns true.
 */
export async function executeAIWithRetries<TCallResult extends CallResultWithUsage, TResult>(
  opts: ExecuteOptions<TCallResult, TResult>,
): Promise<ExecuteResult<TResult>> {
  let inputTokens = 0;
  let outputTokens = 0;
  let attempts = 0;
  let retryParseFailures = 0;
  let keptRetryCount = 0;
  let skippedRetryCount = 0;

  let currentResult: TResult;
  try {
    const raw = await opts.initial();
    attempts += 1;
    inputTokens += raw.inputTokens;
    outputTokens += raw.outputTokens;
    currentResult = opts.consume(raw);
  } catch (err) {
    if (!opts.onParseFailure) throw err;
    const recovered = await opts.onParseFailure();
    attempts += 2;
    inputTokens += recovered.raw.inputTokens;
    outputTokens += recovered.raw.outputTokens;
    currentResult = recovered.result;
  }
  // Scored now: callers mutate the final result (e.g. push warnings) afterwards.
  const initialScore = opts.score?.(currentResult);

  for (let i = 0; i < opts.retries.length; i++) {
    const step = opts.retries[i];
    const addendum = step.buildRetryMessage(currentResult, i + 1);
    if (addendum == null) {
      skippedRetryCount += 1;
      continue;
    }

    try {
      const raw = await opts.retry(`${opts.userMessage}${addendum}`, step);
      attempts += 1;
      inputTokens += raw.inputTokens;
      outputTokens += raw.outputTokens;
      const candidate = opts.consume(raw);
      if (!step.shouldKeep || step.shouldKeep(currentResult, candidate)) {
        currentResult = candidate;
        keptRetryCount += 1;
      }
    } catch (err) {
      retryParseFailures += 1;
      console.warn(`[AI Runtime] Retry step ${i + 1} parse failure:`, err);
    }
  }

  return {
    result: currentResult,
    inputTokens,
    outputTokens,
    attempts,
    retryParseFailures,
    keptRetryCount,
    skippedRetryCount,
    initialScore,
  };
}

/**
 * Build a JSON-serialized telemetry payload for `logAiUsage.errorMessage`.
 * Returns undefined when there is nothing meaningful to log (no warnings and
 * no retry activity), so successful single-shot calls don't pollute logs.
 * Includes a category-count rollup of warnings plus a bounded sample of the
 * raw prose (sampleWarnings), both read by the admin AI-warnings page.
 */
export function buildExecMetadata<T>(
  exec: ExecuteResult<T>,
  warnings: string[] = [],
): string | undefined {
  const hasWarnings = warnings.length > 0;
  const hasRetryActivity = exec.attempts > 1 || exec.retryParseFailures > 0;
  if (!hasWarnings && !hasRetryActivity) return undefined;

  const payload: Record<string, unknown> = {};
  if (hasWarnings) {
    payload.warnings = sampleWarnings(warnings);
    payload.warningCategories = categorizeWarnings(warnings);
  }
  if (hasRetryActivity) {
    payload.attempts = exec.attempts;
    if (exec.retryParseFailures > 0) payload.retryParseFailures = exec.retryParseFailures;
    if (exec.keptRetryCount > 0) payload.keptRetryCount = exec.keptRetryCount;
  }
  return JSON.stringify(payload);
}
