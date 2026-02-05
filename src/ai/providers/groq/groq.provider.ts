import Groq from 'groq-sdk';
import { z } from 'zod';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export class GroqJsonError extends Error {
  public readonly name = 'GroqJsonError';
  constructor(
    public readonly code: 'TRUNCATED' | 'INVALID_JSON' | 'SCHEMA',
    message: string,
    public readonly meta?: {
      model?: string;
      finishReason?: string | null;
      rawPreview?: string;
      fixedPreview?: string;
      cause?: unknown;
    }
  ) {
    super(message);
  }
}

const previewText = (s: string, max = 800) => {
  const str = String(s ?? '');
  if (str.length <= max) return str;
  return `${str.slice(0, max)}\n... [truncated ${str.length - max} chars]`;
};

const extractFirstJsonObject = (raw: string) => {
  const s = String(raw ?? '').trim();
  if (!s) return '';

  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) return s.slice(start, end + 1).trim();

  return s;
};

const sanitizeJson = (raw: string) => {
  const s = String(raw ?? '');
  if (!s) return s;

  let out = '';
  let inString = false;
  let escape = false;
  let lastWasSpaceInString = false;

  const isWs = (c: string) => c === ' ' || c === '\n' || c === '\r' || c === '\t';

  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i] as string;

    if (inString) {
      if (escape) {
        out += ch;
        escape = false;
        lastWasSpaceInString = false;
        continue;
      }

      if (ch === '\\') {
        out += ch;
        escape = true;
        lastWasSpaceInString = false;
        continue;
      }

      if (ch === '"') {
        out += ch;
        inString = false;
        lastWasSpaceInString = false;
        continue;
      }

      if (ch === '\n' || ch === '\r' || ch === '\t') {
        if (!lastWasSpaceInString) {
          out += ' ';
          lastWasSpaceInString = true;
        }
        continue;
      }

      if (ch === ' ') {
        if (!lastWasSpaceInString) {
          out += ' ';
          lastWasSpaceInString = true;
        }
        continue;
      }

      out += ch;
      lastWasSpaceInString = false;
      continue;
    }

    if (ch === '"') {
      out += ch;
      inString = true;
      continue;
    }

    if (isWs(ch)) {
      continue;
    }

    if (ch === ',') {
      let j = i + 1;
      while (j < s.length && isWs(s[j] as string)) j += 1;
      const next = j < s.length ? (s[j] as string) : '';
      if (next === ']' || next === '}') {
        continue;
      }
      out += ch;
      continue;
    }

    out += ch;
  }

  return out.trim();
};

const tryParseJson = (raw: string) => {
  const candidate = extractFirstJsonObject(raw);
  const sanitized = sanitizeJson(candidate);
  try {
    return { ok: true as const, value: JSON.parse(sanitized), candidate: sanitized };
  } catch (e) {
    return { ok: false as const, error: e, candidate: sanitized };
  }
};

export class GroqProvider {
  private readonly groq: Groq;

  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  private get model() {
    return process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  }

  private async chatCompletion(
    messages: ChatMessage[],
    opts?: { temperature?: number; maxCompletionTokens?: number; topP?: number }
  ) {
    return this.groq.chat.completions.create({
      messages,
      model: this.model,
      temperature: opts?.temperature ?? 0.2,
      max_completion_tokens: opts?.maxCompletionTokens ?? 900,
      top_p: opts?.topP ?? 1,
    });
  }

  async chat(messages: ChatMessage[], opts?: { temperature?: number; maxCompletionTokens?: number; topP?: number }) {
    const completion = await this.chatCompletion(messages, opts);

    return completion.choices[0]?.message?.content || '';
  }

  async *chatStream(
    messages: ChatMessage[],
    opts?: { temperature?: number; maxCompletionTokens?: number; topP?: number; stop?: string | string[] | null }
  ) {
    const stream = await this.groq.chat.completions.create({
      messages,
      model: this.model,
      temperature: opts?.temperature ?? 0.2,
      max_completion_tokens: opts?.maxCompletionTokens ?? 900,
      top_p: opts?.topP ?? 1,
      stop: opts?.stop ?? null,
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        yield token;
      }
    }
  }

  async chatJson<T>(
    messages: ChatMessage[],
    schema: z.ZodType<T, any, any>,
    opts?: { maxCompletionTokens?: number }
  ) {
    const jsonOnly: ChatMessage = {
      role: 'system',
      content:
        'Return ONLY STRICT valid JSON. No markdown. No code fences. No commentary. No trailing commas. Use plain ASCII quotes (\"). Output a single JSON object and nothing else.',
    };

    const jsonOnlyStricter: ChatMessage = {
      role: 'system',
      content:
        'Return VALID JSON ONLY. No markdown. No code fences. No commentary. Do NOT include any line breaks inside JSON strings. No trailing commas. Use plain ASCII quotes (\"). Output a single JSON object and nothing else.',
    };

    const completion = await this.chatCompletion([jsonOnly, ...messages], {
      temperature: 0,
      maxCompletionTokens: opts?.maxCompletionTokens,
    });

    let didSchemaRetry = false;

    const choice = completion.choices[0];
    const raw = choice?.message?.content || '';
    const finishReason = (choice as any)?.finish_reason ?? null;

    if (finishReason === 'length') {
      console.error('GROQ JSON TRUNCATED (finish_reason=length)', {
        model: this.model,
        rawPreview: previewText(raw),
      });
      throw new GroqJsonError('TRUNCATED', 'AI response was truncated; cannot parse JSON safely.', {
        model: this.model,
        finishReason,
        rawPreview: previewText(raw),
      });
    }

    const first = tryParseJson(raw);
    if (first.ok) {
      try {
        return schema.parse(first.value);
      } catch (e) {
        console.error('GROQ JSON SCHEMA VALIDATION FAILED', {
          model: this.model,
          rawPreview: previewText(raw),
          candidatePreview: previewText(first.candidate),
        });

        if (didSchemaRetry) {
          throw new GroqJsonError('SCHEMA', 'AI returned JSON that did not match the required schema.', {
            model: this.model,
            finishReason,
            rawPreview: previewText(raw),
            cause: e,
          });
        }

        didSchemaRetry = true;

        const retryCompletion = await this.chatCompletion([jsonOnlyStricter, ...messages], {
          temperature: 0,
          maxCompletionTokens: opts?.maxCompletionTokens,
        });
        const retryChoice = retryCompletion.choices[0];
        const retryRaw = retryChoice?.message?.content || '';
        const retryFinishReason = (retryChoice as any)?.finish_reason ?? null;

        if (retryFinishReason === 'length') {
          console.error('GROQ JSON TRUNCATED (schema retry, finish_reason=length)', {
            model: this.model,
            rawPreview: previewText(retryRaw),
          });
          throw new GroqJsonError('TRUNCATED', 'AI response was truncated; cannot parse JSON safely.', {
            model: this.model,
            finishReason: retryFinishReason,
            rawPreview: previewText(retryRaw),
            cause: e,
          });
        }

        const retryParsed = tryParseJson(retryRaw);
        if (!retryParsed.ok) {
          console.error('GROQ JSON PARSE FAILED (schema retry)', {
            model: this.model,
            finishReason: retryFinishReason,
            rawPreview: previewText(retryRaw),
            candidatePreview: previewText(retryParsed.candidate),
            error: String((retryParsed as any)?.error?.message || retryParsed.error),
          });
          throw new GroqJsonError('INVALID_JSON', 'AI returned invalid JSON (schema retry).', {
            model: this.model,
            finishReason: retryFinishReason,
            rawPreview: previewText(retryRaw),
            cause: (retryParsed as any)?.error || e,
          });
        }

        try {
          return schema.parse(retryParsed.value);
        } catch (e2) {
          console.error('GROQ JSON SCHEMA VALIDATION FAILED (schema retry)', {
            model: this.model,
            finishReason: retryFinishReason,
            rawPreview: previewText(retryRaw),
            candidatePreview: previewText(retryParsed.candidate),
          });
          throw new GroqJsonError('SCHEMA', 'AI returned JSON that did not match the required schema.', {
            model: this.model,
            finishReason: retryFinishReason,
            rawPreview: previewText(retryRaw),
            cause: e2,
          });
        }
      }
    }

    console.error('GROQ JSON PARSE FAILED (initial)', {
      model: this.model,
      finishReason,
      rawPreview: previewText(raw),
      candidatePreview: previewText(first.candidate),
      error: String((first as any)?.error?.message || first.error),
    });

    const fixedCompletion = await this.chatCompletion(
      [
        jsonOnly,
        ...messages,
        {
          role: 'user',
          content:
            'You must output STRICT valid JSON only. Do not include any explanation. Fix the following into a single valid JSON object:\n' +
            raw,
        },
      ],
      { temperature: 0, maxCompletionTokens: opts?.maxCompletionTokens }
    );

    const fixedChoice = fixedCompletion.choices[0];
    const fixed = fixedChoice?.message?.content || '';
    const fixedFinishReason = (fixedChoice as any)?.finish_reason ?? null;

    if (fixedFinishReason === 'length') {
      console.error('GROQ JSON TRUNCATED (fix attempt, finish_reason=length)', {
        model: this.model,
        rawPreview: previewText(fixed),
      });
      throw new GroqJsonError('TRUNCATED', 'AI fix-attempt response was truncated; cannot parse JSON safely.', {
        model: this.model,
        finishReason: fixedFinishReason,
        rawPreview: previewText(raw),
        fixedPreview: previewText(fixed),
      });
    }

    const second = tryParseJson(fixed);
    if (!second.ok) {
      console.error('GROQ JSON PARSE FAILED (fix attempt)', {
        model: this.model,
        rawPreview: previewText(raw),
        fixedPreview: previewText(fixed),
        candidatePreview: previewText(second.candidate),
        error: String((second as any)?.error?.message || second.error),
      });
      throw new GroqJsonError('INVALID_JSON', 'AI returned invalid JSON (even after fix attempt).', {
        model: this.model,
        finishReason: fixedFinishReason,
        rawPreview: previewText(raw),
        fixedPreview: previewText(fixed),
        cause: second.error,
      });
    }

    try {
      return schema.parse(second.value);
    } catch (e) {
      console.error('GROQ JSON SCHEMA VALIDATION FAILED (fix attempt)', {
        model: this.model,
        rawPreview: previewText(raw),
        fixedPreview: previewText(fixed),
        candidatePreview: previewText(second.candidate),
      });

      if (!didSchemaRetry) {
        didSchemaRetry = true;

        const retryCompletion = await this.chatCompletion([jsonOnlyStricter, ...messages], {
          temperature: 0,
          maxCompletionTokens: opts?.maxCompletionTokens,
        });
        const retryChoice = retryCompletion.choices[0];
        const retryRaw = retryChoice?.message?.content || '';
        const retryFinishReason = (retryChoice as any)?.finish_reason ?? null;

        if (retryFinishReason === 'length') {
          console.error('GROQ JSON TRUNCATED (schema retry, finish_reason=length)', {
            model: this.model,
            rawPreview: previewText(retryRaw),
          });
          throw new GroqJsonError('TRUNCATED', 'AI response was truncated; cannot parse JSON safely.', {
            model: this.model,
            finishReason: retryFinishReason,
            rawPreview: previewText(retryRaw),
            cause: e,
          });
        }

        const retryParsed = tryParseJson(retryRaw);
        if (!retryParsed.ok) {
          console.error('GROQ JSON PARSE FAILED (schema retry)', {
            model: this.model,
            finishReason: retryFinishReason,
            rawPreview: previewText(retryRaw),
            candidatePreview: previewText(retryParsed.candidate),
            error: String((retryParsed as any)?.error?.message || retryParsed.error),
          });
          throw new GroqJsonError('INVALID_JSON', 'AI returned invalid JSON (schema retry).', {
            model: this.model,
            finishReason: retryFinishReason,
            rawPreview: previewText(retryRaw),
            cause: (retryParsed as any)?.error || e,
          });
        }

        try {
          return schema.parse(retryParsed.value);
        } catch (e2) {
          console.error('GROQ JSON SCHEMA VALIDATION FAILED (schema retry)', {
            model: this.model,
            finishReason: retryFinishReason,
            rawPreview: previewText(retryRaw),
            candidatePreview: previewText(retryParsed.candidate),
          });
          throw new GroqJsonError('SCHEMA', 'AI returned JSON that did not match the required schema.', {
            model: this.model,
            finishReason: retryFinishReason,
            rawPreview: previewText(retryRaw),
            cause: e2,
          });
        }
      }

      throw new GroqJsonError('SCHEMA', 'AI returned JSON that did not match the required schema (after fix).', {
        model: this.model,
        finishReason: fixedFinishReason,
        rawPreview: previewText(raw),
        fixedPreview: previewText(fixed),
        cause: e,
      });
    }
  }
}
