import type { PrismaClient } from '@prisma/client';

import type { EmbeddingProvider } from '../ingestion/embeddings/EmbeddingProvider';
import type { VectorStore } from '../ingestion/vectorstore/VectorStore';
import type { GroqProvider } from '../providers/groq/groq.provider';
import { assertMaterialsAccessible } from './materialAccess';

export type AnswerQuestionInput = {
  question: string;
  materialIds: number[];
  topK?: number;
};

export type SummarizeInput = {
  materialIds: number[];
  style?: 'bullet' | 'short' | 'detailed';
};

export type ExamGenerateInput = {
  materialIds: number[];
  count?: number;
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

  private systemPrompt() {
    return [
      'You are the IAP-M Faculty of Business AI academic assistant.',
      'You must follow these rules:',
      '1) Answer ONLY using the provided approved material excerpts (sources).',
      '2) If the answer is not contained in the sources, say you do not have enough approved material to answer.',
      '3) Be accurate, clear, and student-friendly.',
      '4) When you use a source, cite it like [chunk:<id>].',
    ].join('\n');
  }

  private buildSourcesBlock(chunks: Array<{ id: number; text: string }>) {
    return chunks
      .map((c) => `Source [chunk:${c.id}]\n${c.text}`)
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
      select: { id: true, text: true },
    });

    const byId = new Map(chunks.map((c) => [c.id, c] as const));
    const orderedChunks = top
      .map((t) => byId.get(t.chunkId))
      .filter((c): c is { id: number; text: string } => !!c);

    return { top, orderedChunks, chunkIds };
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

    const { top, orderedChunks, chunkIds } = await this.retrieveTopChunks({
      materialIds: input.materialIds,
      queryText: input.question,
      topK: input.topK ?? 6,
    });

    const retrievalRows = top.map((t, rank) => ({
      queryLogId: queryLog.id,
      chunkId: t.chunkId,
      score: t.score,
      rank,
    }));

    if (retrievalRows.length > 0) {
      await this.prisma.aiQueryRetrieval.createMany({ data: retrievalRows });
    }

    const sourcesBlock = this.buildSourcesBlock(orderedChunks);

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

    return {
      statusCode: 200,
      message: {
        answer,
        logId: queryLog.id,
        usedMaterialIds: input.materialIds,
        retrievedChunkIds: chunkIds,
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

    const retrievalRows = top.map((t, rank) => ({
      queryLogId: queryLog.id,
      chunkId: t.chunkId,
      score: t.score,
      rank,
    }));

    if (retrievalRows.length > 0) {
      await this.prisma.aiQueryRetrieval.createMany({ data: retrievalRows });
    }

    const sourcesBlock = this.buildSourcesBlock(orderedChunks);

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

    const sourcesBlock = this.buildSourcesBlock(orderedChunks);

    const summary = await this.groq.chat([
      { role: 'system', content: this.systemPrompt() },
      {
        role: 'user',
        content: `Task: ${queryText}\n\nApproved Sources:\n${sourcesBlock}`,
      },
    ]);

    return { statusCode: 200, message: { summary, usedMaterialIds: input.materialIds } };
  }

  async generateExam(userId: number, input: ExamGenerateInput) {
    if (!input.materialIds || input.materialIds.length === 0) {
      return { statusCode: 400, message: { message: 'materialIds is required' } };
    }

    await assertMaterialsAccessible({ prisma: this.prisma, userId, materialIds: input.materialIds });

    const count = input.count ?? 5;
    const queryText = `Generate ${count} exam questions with answers.`;
    const { orderedChunks } = await this.retrieveTopChunks({
      materialIds: input.materialIds,
      queryText,
      topK: 12,
    });

    const sourcesBlock = this.buildSourcesBlock(orderedChunks);

    const exam = await this.groq.chat([
      { role: 'system', content: this.systemPrompt() },
      {
        role: 'user',
        content: `Task: ${queryText}\nReturn a numbered list with short model answers.\n\nApproved Sources:\n${sourcesBlock}`,
      },
    ]);

    return { statusCode: 200, message: { exam, usedMaterialIds: input.materialIds } };
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
