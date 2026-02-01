import { PrismaClient } from '@prisma/client';

import { AIService } from '../core/AIService';

const prisma = new PrismaClient();
const aiService = new AIService(prisma, );

type AskInput = {
  question?: string;
  materialIds?: number[];
};

export class QueryService {
  async ask(userId: number, input: AskInput) {
    try {
      if (!input.question || input.question.trim().length === 0) {
        return { statusCode: 400, message: { message: 'Question is required' } };
      }

      if (!input.materialIds || input.materialIds.length === 0) {
        return {
          statusCode: 400,
          message: { message: 'materialIds is required (Phase 1: only answer from selected approved materials)' },
        };
      }

      const answerResult = await aiService.answerQuestion(userId, {
        question: input.question,
        materialIds: input.materialIds,
      });

      if (answerResult.statusCode !== 200) {
        return answerResult;
      }

      const answer = (answerResult.message as any)?.answer as string | undefined;

      const log = await prisma.aiQueryLog.create({
        data: {
          userId,
          materialId: input.materialIds[0] ?? null,
          question: input.question,
          answer: answer || null,
        },
      });

      return {
        statusCode: 200,
        message: {
          ...(answerResult.message as any),
          logId: log.id,
        },
      };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }
}
