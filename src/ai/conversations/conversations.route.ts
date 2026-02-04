import express from 'express';
import { PrismaClient } from '@prisma/client';

import { authenticateStudent } from '../../apps/middleware/studentAuthMiddleware';

const prisma = new PrismaClient();
const conversationsRouter = express.Router();

conversationsRouter.get('/', authenticateStudent, async (req, res) => {
  try {
    const userId = (req as any).user?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const rows = await prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { role: true, content: true, createdAt: true },
        },
      },
    });

    return res.status(200).json(
      rows.map((c) => ({
        id: c.id,
        title: c.title,
        type: c.type,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        materialId: c.materialId,
        materialIds: c.materialIds,
        lastMessage: c.messages[0]
          ? {
              role: c.messages[0].role,
              content: c.messages[0].content,
              createdAt: c.messages[0].createdAt,
            }
          : null,
      }))
    );
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

conversationsRouter.get('/:id', authenticateStudent, async (req, res) => {
  try {
    const userId = (req as any).user?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid conversation id' });
    }

    const convo = await prisma.aiConversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            references: {
              orderBy: { sourceNo: 'asc' },
              include: {
                chunk: {
                  select: {
                    id: true,
                    pageStart: true,
                    pageEnd: true,
                    material: { select: { id: true, title: true, cloudinaryUrl: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!convo) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    return res.status(200).json({
      id: convo.id,
      title: convo.title,
      type: convo.type,
      createdAt: convo.createdAt,
      updatedAt: convo.updatedAt,
      materialId: convo.materialId,
      materialIds: convo.materialIds,
      messages: convo.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        references: (m.references || []).map((r) => ({
          sourceNo: r.sourceNo,
          chunkId: r.chunkId,
          materialId: r.chunk.material.id,
          materialTitle: r.chunk.material.title,
          cloudinaryUrl: r.chunk.material.cloudinaryUrl,
          pageStart: r.chunk.pageStart,
          pageEnd: r.chunk.pageEnd,
        })),
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default conversationsRouter;
