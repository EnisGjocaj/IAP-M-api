import express from 'express';
import { PrismaClient } from '@prisma/client';

import { authenticateStudent } from '../../apps/middleware/studentAuthMiddleware';

const prisma = new PrismaClient();
const statsRouter = express.Router();

statsRouter.get('/', authenticateStudent, async (req, res) => {
  try {
    const userId = (req as any).user?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const [
      materialsTotal,
      materialsApproved,
      materialsPending,
      materialsRejected,
      materialsPrivate,
      materialsPublic,
      materialsIndexed,
      materialsIndexing,
      materialsIndexFailed,
      conversationsTotal,
      conversationsChat,
      conversationsSummary,
      conversationsExam,
      conversationMessagesTotal,
      queriesTotal,
      recentMaterials,
      recentConversations,
      recentQueries,
    ] = await Promise.all([
      prisma.aiMaterial.count({ where: { ownerUserId: userId } }),
      prisma.aiMaterial.count({ where: { ownerUserId: userId, isApproved: true } }),
      prisma.aiMaterial.count({
        where: {
          ownerUserId: userId,
          isApproved: false,
          status: { in: ['UPLOADED', 'SUBMITTED'] },
        },
      }),
      prisma.aiMaterial.count({ where: { ownerUserId: userId, status: 'REJECTED' } }),
      prisma.aiMaterial.count({ where: { ownerUserId: userId, visibility: 'PRIVATE' } }),
      prisma.aiMaterial.count({ where: { ownerUserId: userId, visibility: 'PUBLIC' } }),
      prisma.aiMaterial.count({ where: { ownerUserId: userId, indexStatus: 'INDEXED' } }),
      prisma.aiMaterial.count({ where: { ownerUserId: userId, indexStatus: 'INDEXING' } }),
      prisma.aiMaterial.count({ where: { ownerUserId: userId, indexStatus: 'FAILED' } }),
      prisma.aiConversation.count({ where: { userId } }),
      prisma.aiConversation.count({ where: { userId, type: 'CHAT' } }),
      prisma.aiConversation.count({ where: { userId, type: 'SUMMARY' } }),
      prisma.aiConversation.count({ where: { userId, type: 'EXAM' } }),
      prisma.aiConversationMessage.count({ where: { conversation: { userId } } }),
      prisma.aiQueryLog.count({ where: { userId } }),
      prisma.aiMaterial.findMany({
        where: { ownerUserId: userId },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        select: {
          id: true,
          title: true,
          status: true,
          isApproved: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
      prisma.aiConversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        select: {
          id: true,
          type: true,
          title: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
      prisma.aiQueryLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          question: true,
          createdAt: true,
          material: { select: { id: true, title: true } },
        },
      }),
    ]);

    const recentActivity = [
      ...recentMaterials.map((m) => ({
        kind: 'MATERIAL' as const,
        id: m.id,
        title: m.title,
        timestamp: m.updatedAt || m.createdAt,
        meta: {
          status: m.status,
          approved: m.isApproved,
        },
      })),
      ...recentConversations.map((c) => ({
        kind: 'CONVERSATION' as const,
        id: c.id,
        title: c.title,
        timestamp: c.updatedAt || c.createdAt,
        meta: { type: c.type },
      })),
      ...recentQueries.map((q) => ({
        kind: 'QUERY' as const,
        id: q.id,
        title: q.question,
        timestamp: q.createdAt,
        meta: { materialTitle: q.material?.title || null },
      })),
    ]
      .sort((a, b) => new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime())
      .slice(0, 12);

    return res.status(200).json({
      materials: {
        total: materialsTotal,
        approved: materialsApproved,
        pending: materialsPending,
        rejected: materialsRejected,
        visibility: {
          private: materialsPrivate,
          public: materialsPublic,
        },
        indexStatus: {
          indexed: materialsIndexed,
          indexing: materialsIndexing,
          failed: materialsIndexFailed,
        },
      },
      conversations: {
        total: conversationsTotal,
        chat: conversationsChat,
        summary: conversationsSummary,
        exam: conversationsExam,
        messages: conversationMessagesTotal,
      },
      queries: {
        total: queriesTotal,
      },
      recentActivity,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default statsRouter;
