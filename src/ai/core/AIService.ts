import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

import type { EmbeddingProvider } from '../ingestion/embeddings/EmbeddingProvider';
import type { VectorStore } from '../ingestion/vectorstore/VectorStore';
import type { GroqProvider } from '../providers/groq/groq.provider';
import { GroqJsonError } from '../providers/groq/groq.provider';
import { assertMaterialsAccessible } from './materialAccess';

export type AnswerQuestionInput = {
  question: string;
  materialIds: number[];
  topK?: number;
  conversationId?: number;
};

export type SummarizeInput = {
  materialIds: number[];
  style?: 'bullet' | 'short' | 'detailed';
  conversationId?: number;
  saveConversation?: boolean;
};

export type ExamGenerateInput = {
  materialIds: number[];
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  examType?: string;
  conversationId?: number;
  saveConversation?: boolean;
};

export type AdvisorInput = {
  prompt: string;
};

export class AIService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly groq: GroqProvider,
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly vectorStore: VectorStore
  ) {}

  private noRetrievalMessage() {
    return 'Not enough approved material to answer this question.';
  }

  private systemPrompt() {
    return [
      'You are the IAP-M Faculty of Business AI academic assistant.',
      'You must follow these rules:',
      '1) Answer ONLY using the provided approved material excerpts (sources).',
      '2) If the answer is not contained in the sources, say you do not have enough approved material to answer.',
      '3) Be accurate, clear, and student-friendly.',
      '4) When you use a source, cite it like [1], [2], etc, matching the source numbers provided.',
    ].join('\n');
  }

  private buildSourcesBlock(
    chunks: Array<{
      sourceNo: number;
      chunkId: number;
      text: string;
      materialTitle: string;
      pageStart: number | null;
      pageEnd: number | null;
    }>
  ) {
    return chunks
      .map((c) => {
        const pages =
          c.pageStart && c.pageEnd
            ? c.pageStart === c.pageEnd
              ? `page ${c.pageStart}`
              : `pages ${c.pageStart}–${c.pageEnd}`
            : 'pages ?';
        return `Source [${c.sourceNo}] ${c.materialTitle} (${pages})\n${c.text}`;
      })
      .join('\n\n---\n\n');
  }

  private async retrieveTopChunks(params: {
    materialIds: number[];
    queryText: string;
    topK: number;
  }) {
    const qVec = await this.embeddingProvider.embed(params.queryText);

    const top = await this.vectorStore.search({
      materialIds: params.materialIds,
      embeddingModel: this.embeddingProvider.modelName(),
      queryVector: qVec,
      topK: params.topK,
    });

    const chunkIds = top.map((t) => t.chunkId);
    const chunks = await this.prisma.aiMaterialChunk.findMany({
      where: { id: { in: chunkIds } },
      select: {
        id: true,
        text: true,
        pageStart: true,
        pageEnd: true,
        material: { select: { id: true, title: true, cloudinaryUrl: true } },
      },
    });

    const byId = new Map(chunks.map((c) => [c.id, c] as const));
    const orderedChunks = top
      .map((t) => byId.get(t.chunkId))
      .filter(
        (c): c is {
          id: number;
          text: string;
          pageStart: number | null;
          pageEnd: number | null;
          material: { id: number; title: string; cloudinaryUrl: string | null };
        } => !!c
      );

    return { top, orderedChunks, chunkIds };
  }

  private async ensureConversation(params: {
    userId: number;
    conversationId?: number;
    type: 'CHAT' | 'SUMMARY' | 'EXAM';
    title: string;
    materialIds: number[];
    materialId?: number | null;
  }) {
    if (params.conversationId) {
      const convo = await (this.prisma as any).aiConversation.findFirst({
        where: { id: params.conversationId, userId: params.userId },
        select: { id: true },
      });
      if (!convo) throw new Error('Conversation not found');
      return params.conversationId;
    }

    const created = await (this.prisma as any).aiConversation.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        materialIds: params.materialIds,
        materialId: params.materialId ?? null,
      },
      select: { id: true },
    });

    return created.id as number;
  }

  async answerQuestion(userId: number, input: AnswerQuestionInput) {
    if (!input.question || input.question.trim().length === 0) {
      return { statusCode: 400, message: { message: 'Question is required' } };
    }
    if (!input.materialIds || input.materialIds.length === 0) {
      return { statusCode: 400, message: { message: 'materialIds is required' } };
    }

    await assertMaterialsAccessible({ prisma: this.prisma, userId, materialIds: input.materialIds });

    const queryLog = await this.prisma.aiQueryLog.create({
      data: {
        userId,
        materialId: input.materialIds[0] ?? null,
        question: input.question,
        answer: null,
      },
    });

    const conversationId = await this.ensureConversation({
      userId,
      conversationId: input.conversationId,
      type: 'CHAT',
      title: (input.question || 'New chat').slice(0, 80),
      materialIds: input.materialIds,
    });

    await (this.prisma as any).aiConversationMessage.create({
      data: {
        conversationId,
        role: 'USER',
        content: input.question,
      },
    });

    const { top, orderedChunks, chunkIds } = await this.retrieveTopChunks({
      materialIds: input.materialIds,
      queryText: input.question,
      topK: input.topK ?? 6,
    });

    if (orderedChunks.length === 0) {
      const answer = this.noRetrievalMessage();

      await this.prisma.aiQueryLog.update({
        where: { id: queryLog.id },
        data: { answer },
      });

      await (this.prisma as any).aiConversationMessage.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          content: answer,
        },
      });

      await (this.prisma as any).aiConversation.update({
        where: { id: conversationId },
        data: { materialIds: input.materialIds },
      });

      return {
        statusCode: 200,
        message: {
          answer,
          logId: queryLog.id,
          usedMaterialIds: input.materialIds,
          retrievedChunkIds: [],
          conversationId,
          references: [],
        },
      };
    }

    const retrievalRows = top.map((t, rank) => ({
      queryLogId: queryLog.id,
      chunkId: t.chunkId,
      score: t.score,
      rank,
    }));

    if (retrievalRows.length > 0) {
      await this.prisma.aiQueryRetrieval.createMany({ data: retrievalRows });
    }

    const numberedSources = orderedChunks.map((c, idx) => ({
      sourceNo: idx + 1,
      chunkId: c.id,
      text: c.text,
      materialTitle: c.material.title,
      materialId: c.material.id,
      cloudinaryUrl: c.material.cloudinaryUrl,
      pageStart: c.pageStart,
      pageEnd: c.pageEnd,
    }));

    const sourcesBlock = this.buildSourcesBlock(numberedSources);

    const answer = await this.groq.chat([
      { role: 'system', content: this.systemPrompt() },
      {
        role: 'user',
        content: `Question:\n${input.question}\n\nApproved Sources:\n${sourcesBlock}`,
      },
    ]);

    await this.prisma.aiQueryLog.update({
      where: { id: queryLog.id },
      data: { answer },
    });

    const assistantMsg = await (this.prisma as any).aiConversationMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: answer,
      },
      select: { id: true },
    });

    await (this.prisma as any).aiMessageReference.createMany({
      data: numberedSources.map((s) => ({
        messageId: assistantMsg.id,
        chunkId: s.chunkId,
        sourceNo: s.sourceNo,
      })),
    });

    await (this.prisma as any).aiConversation.update({
      where: { id: conversationId },
      data: { materialIds: input.materialIds },
    });

    return {
      statusCode: 200,
      message: {
        answer,
        logId: queryLog.id,
        usedMaterialIds: input.materialIds,
        retrievedChunkIds: chunkIds,
        conversationId,
        references: numberedSources.map((s) => ({
          sourceNo: s.sourceNo,
          chunkId: s.chunkId,
          materialId: s.materialId,
          materialTitle: s.materialTitle,
          cloudinaryUrl: s.cloudinaryUrl,
          pageStart: s.pageStart,
          pageEnd: s.pageEnd,
        })),
      },
    };
  }

  async *streamAnswerQuestion(userId: number, input: AnswerQuestionInput) {
    if (!input.question || input.question.trim().length === 0) {
      throw new Error('Question is required');
    }
    if (!input.materialIds || input.materialIds.length === 0) {
      throw new Error('materialIds is required');
    }

    await assertMaterialsAccessible({ prisma: this.prisma, userId, materialIds: input.materialIds });

    const queryLog = await this.prisma.aiQueryLog.create({
      data: {
        userId,
        materialId: input.materialIds[0] ?? null,
        question: input.question,
        answer: null,
      },
    });

    const { top, orderedChunks } = await this.retrieveTopChunks({
      materialIds: input.materialIds,
      queryText: input.question,
      topK: input.topK ?? 6,
    });

    if (orderedChunks.length === 0) {
      const answer = this.noRetrievalMessage();
      await this.prisma.aiQueryLog.update({
        where: { id: queryLog.id },
        data: { answer },
      });

      yield answer;
      return;
    }

    const retrievalRows = top.map((t, rank) => ({
      queryLogId: queryLog.id,
      chunkId: t.chunkId,
      score: t.score,
      rank,
    }));

    if (retrievalRows.length > 0) {
      await this.prisma.aiQueryRetrieval.createMany({ data: retrievalRows });
    }

    const numberedSources = orderedChunks.map((c, idx) => ({
      sourceNo: idx + 1,
      chunkId: c.id,
      text: c.text,
      materialTitle: c.material.title,
      pageStart: c.pageStart,
      pageEnd: c.pageEnd,
    }));

    const sourcesBlock = this.buildSourcesBlock(numberedSources);

    let accumulated = '';
    for await (const token of this.groq.chatStream([
      { role: 'system', content: this.systemPrompt() },
      {
        role: 'user',
        content: `Question:\n${input.question}\n\nApproved Sources:\n${sourcesBlock}`,
      },
    ])) {
      accumulated += token;
      yield token;
    }

    await this.prisma.aiQueryLog.update({
      where: { id: queryLog.id },
      data: { answer: accumulated },
    });
  }

  async summarize(userId: number, input: SummarizeInput) {
    if (!input.materialIds || input.materialIds.length === 0) {
      return { statusCode: 400, message: { message: 'materialIds is required' } };
    }

    await assertMaterialsAccessible({ prisma: this.prisma, userId, materialIds: input.materialIds });

    const queryText = `Summarize the material in ${input.style || 'bullet'} style.`;
    const { orderedChunks } = await this.retrieveTopChunks({
      materialIds: input.materialIds,
      queryText,
      topK: 10,
    });

    if (orderedChunks.length === 0) {
      return {
        statusCode: 200,
        message: {
          summary: 'Not enough approved material to summarize.',
          usedMaterialIds: input.materialIds,
        },
      };
    }

    const numberedSources = orderedChunks.map((c, idx) => ({
      sourceNo: idx + 1,
      chunkId: c.id,
      text: c.text,
      materialTitle: c.material.title,
      materialId: c.material.id,
      cloudinaryUrl: c.material.cloudinaryUrl,
      pageStart: c.pageStart,
      pageEnd: c.pageEnd,
    }));

    const sourcesBlock = this.buildSourcesBlock(numberedSources);

    const summary = await this.groq.chat([
      { role: 'system', content: this.systemPrompt() },
      {
        role: 'user',
        content: `Task: ${queryText}\n\nApproved Sources:\n${sourcesBlock}`,
      },
    ]);

    let conversationId: number | undefined = undefined;
    if (input.saveConversation) {
      const materialId = input.materialIds[0] ?? null;
      const materialTitle = materialId
        ? (await this.prisma.aiMaterial.findUnique({ where: { id: materialId }, select: { title: true } }))?.title
        : null;
      const title = materialTitle ? `Summary: ${materialTitle}` : 'Summary';

      conversationId = await this.ensureConversation({
        userId,
        conversationId: input.conversationId,
        type: 'SUMMARY',
        title,
        materialIds: input.materialIds,
        materialId,
      });

      const assistantMsg = await (this.prisma as any).aiConversationMessage.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          content: summary,
        },
        select: { id: true },
      });

      await (this.prisma as any).aiMessageReference.createMany({
        data: numberedSources.map((s) => ({
          messageId: assistantMsg.id,
          chunkId: s.chunkId,
          sourceNo: s.sourceNo,
        })),
      });
    }

    return {
      statusCode: 200,
      message: {
        summary,
        usedMaterialIds: input.materialIds,
        conversationId,
        references: numberedSources.map((s) => ({
          sourceNo: s.sourceNo,
          chunkId: s.chunkId,
          materialId: s.materialId,
          materialTitle: s.materialTitle,
          cloudinaryUrl: s.cloudinaryUrl,
          pageStart: s.pageStart,
          pageEnd: s.pageEnd,
        })),
      },
    };
  }

  async generateExam(userId: number, input: ExamGenerateInput) {
    if (!input.materialIds || input.materialIds.length === 0) {
      return { statusCode: 400, message: { message: 'materialIds is required' } };
    }

    await assertMaterialsAccessible({ prisma: this.prisma, userId, materialIds: input.materialIds });

    const count = input.count ?? 5;
    const difficulty = (input.difficulty || 'medium') as string;
    const examType = String(input.examType || 'multiple-choice');

    const queryText = `Generate ${count} exam questions with answers. Difficulty: ${difficulty}. Type: ${examType}.`;
    const { orderedChunks } = await this.retrieveTopChunks({
      materialIds: input.materialIds,
      queryText,
      topK: 12,
    });

    if (orderedChunks.length === 0) {
      return {
        statusCode: 200,
        message: {
          exam: 'Not enough approved material to generate an exam.',
          usedMaterialIds: input.materialIds,
        },
      };
    }

    const numberedSources = orderedChunks.map((c, idx) => ({
      sourceNo: idx + 1,
      chunkId: c.id,
      text: c.text,
      materialTitle: c.material.title,
      pageStart: c.pageStart,
      pageEnd: c.pageEnd,
    }));

    const sourcesBlock = this.buildSourcesBlock(numberedSources);

    const wordCount = (s: string) =>
      String(s || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;

    const optionItemSchema = z.object({
      key: z.enum(['A', 'B', 'C', 'D']),
      text: z.string().min(1),
    });

    const optionsSchema = z
      .preprocess((val) => {
        if (val == null) return val;
        if (Array.isArray(val)) return val;
        if (typeof val === 'object') {
          const entries = Object.entries(val as Record<string, unknown>);
          const mapped = entries
            .map(([k, v]) => ({
              key: String(k).trim().toUpperCase(),
              text: String(v ?? '').trim(),
            }))
            .filter((o) => ['A', 'B', 'C', 'D'].includes(o.key) && o.text);

          return mapped;
        }

        return val;
      }, z.array(optionItemSchema).length(4))
      .optional();

    const questionSchema = z
      .object({
      id: z.number().int().positive(),
      kind: z.enum(['mcq', 'text']),
      prompt: z.string().min(1).max(200),
      options: optionsSchema,
      correctOption: z
        .preprocess(
          (v) => (typeof v === 'string' ? v.trim().toUpperCase() : v),
          z.enum(['A', 'B', 'C', 'D'])
        )
        .optional(),
      correctAnswer: z
        .string()
        .min(1)
        .refine((v) => wordCount(v) <= 30, { message: 'correctAnswer must be <= 30 words' }),
      explanation: z
        .string()
        .optional()
        .refine((v) => !v || wordCount(v) <= 35, { message: 'explanation must be short' }),
      keywords: z.array(z.string().min(1)).max(5).optional(),
      points: z.number().int().min(1).max(10).default(1),
      })
      .superRefine((q, ctx) => {
        if (q.kind === 'mcq') {
          if (!q.options || q.options.length !== 4) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'mcq must include exactly 4 options (A-D)', path: ['options'] });
          }
          if (!q.correctOption) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'mcq must include correctOption', path: ['correctOption'] });
          }
        } else {
          if (q.correctOption) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'text questions must not include correctOption', path: ['correctOption'] });
          }
        }
      });

    const formatInstruction =
      examType === 'multiple-choice'
        ? 'Use kind="mcq". Provide exactly 4 options (A-D) and correctOption.'
        : 'Use kind="text". Provide a short correctAnswer and 1-5 keywords that should appear in a good student answer.';

    const batchSize = 5;
    const total = Math.max(1, Math.min(50, Number(count) || 5));

    const compactRules =
      'Compactness rules (STRICT):\n' +
      '- prompt: max 200 characters\n' +
      '- correctAnswer: max 30 words\n' +
      '- explanation: max 1 sentence (optional)\n' +
      '- keywords: max 5 items (optional; only for kind="text")\n';

    const tokensPerQuestion = examType === 'multiple-choice' ? 240 : 280;
    const computeMaxTokens = (take: number) => {
      const base = 350;
      const max = base + take * tokensPerQuestion;
      return Math.max(800, Math.min(2000, max));
    };

    const allQuestions: Array<z.output<typeof questionSchema>> = [];

    try {
      for (let startId = 1; startId <= total; startId += batchSize) {
        const take = Math.min(batchSize, total - startId + 1);

        const batchSchema = z.object({
          questions: z.array(questionSchema).length(take),
        });

        const batch = await this.groq.chatJson<z.output<typeof batchSchema>>(
          [
            { role: 'system', content: this.systemPrompt() },
            {
              role: 'user',
              content:
                `Task: Generate ${take} exam questions with answers. Difficulty: ${difficulty}. Type: ${examType}.\n` +
                `You MUST return exactly ${take} questions.\n` +
                `IDs must start at ${startId} and increment by 1.\n` +
                `${compactRules}` +
                `IMPORTANT: For mcq questions, options MUST be an array like: [{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}]. Do NOT use an object map.\n` +
                `Return JSON with the schema: { questions: Array<{id, kind, prompt, options?, correctOption?, correctAnswer, explanation?, keywords?, points}> }.\n` +
                `${formatInstruction}\n` +
                `Keep prompts student-friendly and based only on the approved sources.\n\nApproved Sources:\n${sourcesBlock}`,
            },
          ],
          batchSchema,
          { maxCompletionTokens: computeMaxTokens(take) }
        );

        allQuestions.push(...batch.questions);
      }
    } catch (e: any) {
      if (e instanceof GroqJsonError && e.code === 'TRUNCATED') {
        throw e;
      }

      return {
        statusCode: 200,
        message: {
          exam:
            'Gjenerimi i provimit dështoi për shkak të një përgjigjeje jo të plotë nga modeli AI. Ju lutem provoni përsëri (ose ulni numrin e pyetjeve).',
          usedMaterialIds: input.materialIds,
        },
      };
    }

    const normalizedQuestions = allQuestions.slice(0, total).map((q, idx) => ({
      ...q,
      id: idx + 1,
    }));

    const finalExamSchema = z.object({
      questions: z.array(questionSchema).length(total),
    });

    const examJson = finalExamSchema.parse({ questions: normalizedQuestions });

    const examText = (() => {
      const lines: string[] = [];
      lines.push('QUESTIONS');
      lines.push('');
      for (const q of examJson.questions) {
        lines.push(`${q.id}. ${q.prompt}`);
        if (q.kind === 'mcq' && Array.isArray(q.options) && q.options.length > 0) {
          for (const opt of q.options) {
            lines.push(`${opt.key}) ${opt.text}`);
          }
        }
        lines.push('');
      }
      lines.push('ANSWERS');
      lines.push('');
      for (const q of examJson.questions) {
        const opt = q.kind === 'mcq' && q.correctOption ? `${q.correctOption} — ` : '';
        lines.push(`${q.id}) ${opt}${q.correctAnswer}`);
      }
      return lines.join('\n').trim();
    })();

    let conversationId: number | undefined = undefined;
    if (input.saveConversation) {
      const materialId = input.materialIds[0] ?? null;
      const materialTitle = materialId
        ? (await this.prisma.aiMaterial.findUnique({ where: { id: materialId }, select: { title: true } }))?.title
        : null;

      const title = materialTitle ? `Exam Prep: ${materialTitle}` : 'Exam Prep';

      conversationId = await this.ensureConversation({
        userId,
        conversationId: input.conversationId,
        type: 'EXAM',
        title,
        materialIds: input.materialIds,
        materialId,
      });

      const assistantMsg = await (this.prisma as any).aiConversationMessage.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          content: examText,
        },
        select: { id: true },
      });

      await (this.prisma as any).aiMessageReference.createMany({
        data: numberedSources.map((s) => ({
          messageId: assistantMsg.id,
          chunkId: s.chunkId,
          sourceNo: s.sourceNo,
        })),
      });
    }

    return {
      statusCode: 200,
      message: {
        exam: examText,
        examJson,
        usedMaterialIds: input.materialIds,
        conversationId,
        references: numberedSources.map((s) => ({
          sourceNo: s.sourceNo,
          chunkId: s.chunkId,
          materialTitle: s.materialTitle,
          pageStart: s.pageStart,
          pageEnd: s.pageEnd,
        })),
      },
    };
  }

  async advise(userId: number, input: AdvisorInput) {
    if (!input.prompt || input.prompt.trim().length === 0) {
      return { statusCode: 400, message: { message: 'prompt is required' } };
    }

    const advice = await this.groq.chat([
      {
        role: 'system',
        content:
          'You are an academic advisor for IAP-M Faculty of Business. Be structured, practical, and concise.',
      },
      { role: 'user', content: input.prompt },
    ]);

    return { statusCode: 200, message: { advice } };
  }
}
