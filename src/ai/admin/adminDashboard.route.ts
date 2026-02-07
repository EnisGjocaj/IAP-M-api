import express from 'express';
import { PrismaClient } from '@prisma/client';

import { authenticateJWT, requireAdmin } from '../../apps/middleware/authMiddleware';

const prisma = new PrismaClient();
const adminDashboardRouter = express.Router();

const parseRangeDays = (range: unknown) => {
  const r = String(range || '7d').trim().toLowerCase();
  if (r === '30d') return 30;
  return 7;
};

const startOfDayUtc = (d: Date) => {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return x;
};

const startOfWeekUtc = (d: Date) => {
  const day = startOfDayUtc(d);
  const weekday = day.getUTCDay();
  const diff = (weekday + 6) % 7;
  return new Date(day.getTime() - diff * 24 * 60 * 60 * 1000);
};

adminDashboardRouter.get('/dashboard', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const days = parseRangeDays((req.query as any)?.range);
    const now = new Date();
    const start = startOfDayUtc(new Date(now.getTime() - days * 24 * 60 * 60 * 1000));

    const [
      askAiRequests,
      chatCount,
      summaryCount,
      examCount,
      materialsApproved,
      materialsPending,
      materialsRejected,
      materialsIndexed,
      materialsIndexing,
      materialsFailed,
      activeUsersQuery,
      activeUsersConv,
      topQueryUsersRaw,
      topConvUsersRaw,
      qDailyRaw,
      convDailyRaw,
      topMaterialRaw,
      recentQueries,
      recentConversations,
    ] = await Promise.all([
      prisma.aiQueryLog.count({}),
      prisma.aiConversation.count({ where: { type: 'CHAT' } }),
      prisma.aiConversation.count({ where: { type: 'SUMMARY' } }),
      prisma.aiConversation.count({ where: { type: 'EXAM' } }),

      prisma.aiMaterial.count({ where: { status: 'APPROVED' } }),
      prisma.aiMaterial.count({ where: { status: { in: ['UPLOADED', 'SUBMITTED'] } } }),
      prisma.aiMaterial.count({ where: { status: 'REJECTED' } }),

      prisma.aiMaterial.count({ where: { indexStatus: 'INDEXED' } }),
      prisma.aiMaterial.count({ where: { indexStatus: 'INDEXING' } }),
      prisma.aiMaterial.count({ where: { indexStatus: 'FAILED' } }),

      prisma.aiQueryLog.findMany({
        where: { createdAt: { gte: start } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.aiConversation.findMany({
        where: { createdAt: { gte: start } },
        distinct: ['userId'],
        select: { userId: true },
      }),

      prisma.aiQueryLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: start } },
        _count: { id: true },
      }) as any,
      prisma.aiConversation.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: start } },
        _count: { id: true },
      }) as any,

      prisma.aiQueryLog.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      prisma.aiConversation.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true, type: true },
      }),

      prisma.aiQueryLog.groupBy({
        by: ['materialId'],
        where: { createdAt: { gte: start }, materialId: { not: null } },
        _count: { id: true },
      }) as any,

      prisma.aiQueryLog.findMany({
        where: { createdAt: { gte: start } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, userId: true, materialId: true, question: true, createdAt: true },
      }),
      prisma.aiConversation.findMany({
        where: { createdAt: { gte: start } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, userId: true, type: true, title: true, createdAt: true },
      }),
    ]);

    const activeUserSet = new Set<number>();
    for (const u of activeUsersQuery) activeUserSet.add(u.userId);
    for (const u of activeUsersConv) activeUserSet.add(u.userId);

    const userCounts = new Map<number, number>();
    for (const row of topQueryUsersRaw as Array<{ userId: number; _count: { id: number } }>) {
      userCounts.set(row.userId, (userCounts.get(row.userId) || 0) + (row._count?.id || 0));
    }
    for (const row of topConvUsersRaw as Array<{ userId: number; _count: { id: number } }>) {
      userCounts.set(row.userId, (userCounts.get(row.userId) || 0) + (row._count?.id || 0));
    }

    const topUserIds = Array.from(userCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => id);
    const users = await prisma.user.findMany({
      where: { id: { in: topUserIds } },
      select: { id: true, name: true, surname: true, email: true },
    });
    const userById = new Map(users.map((u) => [u.id, u] as const));

    const topUsers = Array.from(userCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, interactions]) => {
        const u = userById.get(userId);
        return {
          userId,
          name: u?.name || '',
          surname: u?.surname || '',
          email: u?.email || '',
          interactions,
        };
      });

    const dailyMap = new Map<
      string,
      { date: string; askAi: number; chat: number; summary: number; exam: number }
    >();

    for (let i = days - 1; i >= 0; i -= 1) {
      const d = startOfDayUtc(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, { date: key, askAi: 0, chat: 0, summary: 0, exam: 0 });
    }

    for (const q of qDailyRaw) {
      const key = startOfDayUtc(new Date(q.createdAt)).toISOString().slice(0, 10);
      const row = dailyMap.get(key);
      if (row) row.askAi += 1;
    }

    for (const c of convDailyRaw) {
      const key = startOfDayUtc(new Date(c.createdAt)).toISOString().slice(0, 10);
      const row = dailyMap.get(key);
      if (!row) continue;
      if (c.type === 'CHAT') row.chat += 1;
      if (c.type === 'SUMMARY') row.summary += 1;
      if (c.type === 'EXAM') row.exam += 1;
    }

    const weeklyMap = new Map<
      string,
      { weekStart: string; askAi: number; chat: number; summary: number; exam: number }
    >();

    for (const q of qDailyRaw) {
      const wk = startOfWeekUtc(new Date(q.createdAt)).toISOString().slice(0, 10);
      const row = weeklyMap.get(wk) || { weekStart: wk, askAi: 0, chat: 0, summary: 0, exam: 0 };
      row.askAi += 1;
      weeklyMap.set(wk, row);
    }

    for (const c of convDailyRaw) {
      const wk = startOfWeekUtc(new Date(c.createdAt)).toISOString().slice(0, 10);
      const row = weeklyMap.get(wk) || { weekStart: wk, askAi: 0, chat: 0, summary: 0, exam: 0 };
      if (c.type === 'CHAT') row.chat += 1;
      if (c.type === 'SUMMARY') row.summary += 1;
      if (c.type === 'EXAM') row.exam += 1;
      weeklyMap.set(wk, row);
    }

    const trends = {
      daily: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      weekly: Array.from(weeklyMap.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    };

    const breakdown = {
      askAi: askAiRequests,
      chat: chatCount,
      summary: summaryCount,
      exam: examCount,
      advisor: 0,
    };

    const kpis = {
      totalInteractions: breakdown.askAi + breakdown.chat + breakdown.summary + breakdown.exam,
      activeUsers: activeUserSet.size,
      examsGenerated: breakdown.exam,
      summariesCreated: breakdown.summary,
      askAiRequests: breakdown.askAi,
    };

    const materials = {
      approved: materialsApproved,
      pending: materialsPending,
      rejected: materialsRejected,
      indexed: materialsIndexed,
      indexing: materialsIndexing,
      failed: materialsFailed,
    };

    const topMaterialPairs = (topMaterialRaw as Array<{ materialId: number; _count: { id: number } }>).
      map((r) => ({ materialId: r.materialId, interactions: r._count?.id || 0 }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 10);

    const materialIds = topMaterialPairs.map((m) => m.materialId);
    const materialRows = await prisma.aiMaterial.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, title: true, ownerUserId: true },
    });
    const materialById = new Map(materialRows.map((m) => [m.id, m] as const));
    const topMaterials = topMaterialPairs.map((m) => ({
      materialId: m.materialId,
      title: materialById.get(m.materialId)?.title || '',
      interactions: m.interactions,
    }));

    const recentActivity = [] as Array<{
      kind: 'ASK_AI' | 'CHAT' | 'SUMMARY' | 'EXAM';
      createdAt: string;
      userId: number;
      materialId?: number | null;
      title: string;
    }>;

    for (const q of recentQueries as any[]) {
      recentActivity.push({
        kind: 'ASK_AI',
        createdAt: new Date(q.createdAt).toISOString(),
        userId: q.userId,
        materialId: q.materialId ?? null,
        title: String(q.question || '').slice(0, 140),
      });
    }

    for (const c of recentConversations as any[]) {
      recentActivity.push({
        kind: c.type,
        createdAt: new Date(c.createdAt).toISOString(),
        userId: c.userId,
        materialId: null,
        title: String(c.title || '').slice(0, 140),
      });
    }

    recentActivity.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return res.status(200).json({
      kpis,
      breakdown,
      materials,
      trends,
      topUsers,
      topMaterials,
      recentActivity: recentActivity.slice(0, 25),
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default adminDashboardRouter;
