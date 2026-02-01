import Groq from 'groq-sdk';
import { z } from 'zod';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

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

  async chat(messages: ChatMessage[], opts?: { temperature?: number; maxCompletionTokens?: number; topP?: number }) {
    const completion = await this.groq.chat.completions.create({
      messages,
      model: this.model,
      temperature: opts?.temperature ?? 0.2,
      max_completion_tokens: opts?.maxCompletionTokens ?? 900,
      top_p: opts?.topP ?? 1,
    });

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

  async chatJson<T>(messages: ChatMessage[], schema: z.ZodSchema<T>) {
    const jsonOnly: ChatMessage = {
      role: 'system',
      content:
        'Return ONLY valid JSON. No markdown. No code fences. No commentary. Use the exact keys requested and nothing else.',
    };

    const raw = await this.chat([jsonOnly, ...messages], { temperature: 0 });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const fixed = await this.chat(
        [
          jsonOnly,
          ...messages,
          { role: 'user', content: `Fix this into valid JSON only:\n${raw}` },
        ],
        { temperature: 0 }
      );
      parsed = JSON.parse(fixed);
    }

    return schema.parse(parsed);
  }
}
