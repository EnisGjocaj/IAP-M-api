import type { PrismaClient } from '@prisma/client';

import type { EmbeddingProvider } from '../ingestion/embeddings/EmbeddingProvider';
import type { VectorStore } from '../ingestion/vectorstore/VectorStore';
import type { GroqProvider } from '../providers/groq/groq.provider';
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
    const queryText = `Generate ${count} exam questions with answers.`;
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

    const exam = await this.groq.chat([
      { role: 'system', content: this.systemPrompt() },
      {
        role: 'user',
        content: `Task: ${queryText}\nReturn a numbered list with short model answers.\n\nApproved Sources:\n${sourcesBlock}`,
      },
    ]);

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
          content: exam,
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
        exam,
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
