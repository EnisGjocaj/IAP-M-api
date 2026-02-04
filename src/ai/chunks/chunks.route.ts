import express from 'express';
import { PrismaClient } from '@prisma/client';

import { authenticateStudent } from '../../apps/middleware/studentAuthMiddleware';

const prisma = new PrismaClient();
const chunksRouter = express.Router();

chunksRouter.get('/:id', authenticateStudent, async (req, res) => {
  try {
    const userId = (req as any).user?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid chunk id' });
    }

    const chunk = await prisma.aiMaterialChunk.findUnique({
      where: { id },
      select: {
        id: true,
        text: true,
        pageStart: true,
        pageEnd: true,
        material: {
          select: {
            id: true,
            title: true,
            cloudinaryUrl: true,
            ownerUserId: true,
            visibility: true,
            isApproved: true,
          },
        },
      },
    });

    if (!chunk) {
      return res.status(404).json({ message: 'Chunk not found' });
    }

    const accessible =
      chunk.material.isApproved && (chunk.material.ownerUserId === userId || chunk.material.visibility === 'PUBLIC');

    if (!accessible) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.status(200).json({
      id: chunk.id,
      text: chunk.text,
      pageStart: chunk.pageStart,
      pageEnd: chunk.pageEnd,
      material: {
        id: chunk.material.id,
        title: chunk.material.title,
        cloudinaryUrl: chunk.material.cloudinaryUrl,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default chunksRouter;
