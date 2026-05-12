/**
 * Shared AI call + retry runtime. Encapsulates the three patterns previously
 * scattered across meals/workout/weekly actions:
 *   1. Single text response call with optional retries.
 *   2. Tool-use call with optional retries (weekly only).
 *   3. Token aggregation across the initial call and any retries.
 *
 * Each feature defines its own retry strategy via RetryPlanStep[] — generic
 * "retry on parse fail" is intentionally NOT baked in because retry triggers
 * differ per feature (parse-fail vs content-gap vs truncation).
 */

import type Anthropic from "@anthropic-ai/sdk";
import { getAIClient, AI_MODELS } from "@/lib/ai";

export type AIModelKind = "fast" | "smart";

interface BaseCallOptions {
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
  model?: AIModelKind;
  /** AbortController timeout in ms. Undefined = no timeout (SDK default). */
  timeoutMs?: number;
}

export interface AITextResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
  modelId: string;
}

export interface AIToolResult {
  toolInput: unknown;
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

export async function callAIText(opts: BaseCallOptions): Promise<AITextResult> {
  const client = getAIClient();
  const modelId = resolveModel(opts.model);
  const message = await withOptionalTimeout(opts.timeoutMs, (signal) =>
    client.messages.create(
      {
        model: modelId,
        max_tokens: opts.maxTokens,
        system: buildSystem(opts.systemPrompt),
        messages: [{ role: "user", content: opts.userMessage }],
      },
      signal ? { signal } : undefined,
    ),
  );

  const firstBlock = message.content[0];
  const text = firstBlock?.type === "text" ? firstBlock.text : "";
  return {
    text,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    stopReason: message.stop_reason ?? null,
    modelId,
  };
}

interface ToolDefinition {
  name: string;
  description?: string;
  input_schema: Anthropic.Messages.Tool.InputSchema;
}

export interface CallAIToolOptions extends BaseCallOptions {
  tool: ToolDefinition;
}

export async function callAITool(opts: CallAIToolOptions): Promise<AIToolResult> {
  const client = getAIClient();
  const modelId = resolveModel(opts.model);
  const message = await withOptionalTimeout(opts.timeoutMs, (signal) =>
    client.messages.create(
      {
        model: modelId,
        max_tokens: opts.maxTokens,
        system: buildSystem(opts.systemPrompt),
        tools: [opts.tool],
        tool_choice: { type: "tool", name: opts.tool.name },
        messages: [{ role: "user", content: opts.userMessage }],
      },
      signal ? { signal } : undefined,
    ),
  );

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`No tool_use block in AI response (model=${modelId})`);
  }

  return {
    toolInput: toolUse.input,
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
}

export interface ExecuteResult<TResult> {
  result: TResult;
  inputTokens: number;
  outputTokens: number;
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

  let currentResult: TResult;
  try {
    const raw = await opts.initial();
    inputTokens += raw.inputTokens;
    outputTokens += raw.outputTokens;
    currentResult = opts.consume(raw);
  } catch (err) {
    if (!opts.onParseFailure) throw err;
    const recovered = await opts.onParseFailure();
    inputTokens += recovered.raw.inputTokens;
    outputTokens += recovered.raw.outputTokens;
    currentResult = recovered.result;
  }

  for (let i = 0; i < opts.retries.length; i++) {
    const step = opts.retries[i];
    const addendum = step.buildRetryMessage(currentResult, i + 1);
    if (addendum == null) continue;

    try {
      const raw = await opts.retry(`${opts.userMessage}${addendum}`, step);
      inputTokens += raw.inputTokens;
      outputTokens += raw.outputTokens;
      const candidate = opts.consume(raw);
      if (!step.shouldKeep || step.shouldKeep(currentResult, candidate)) {
        currentResult = candidate;
      }
    } catch {
      // Parse failure on retry — keep current.
    }
  }

  return { result: currentResult, inputTokens, outputTokens };
}
