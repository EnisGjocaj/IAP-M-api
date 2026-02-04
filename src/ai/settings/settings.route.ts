import express from 'express';

import { PrismaClient } from '@prisma/client';
import { authenticateJWT, requireAdmin } from '../../apps/middleware/authMiddleware';

const prisma = new PrismaClient();
const settingsRouter = express.Router();

const ensureSettingsRow = async () => {
  return (prisma as any).aiSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      requireApproval: true,
    },
  });
};

settingsRouter.get('/', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const settings = await ensureSettingsRow();
    return res.status(200).json(settings);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

settingsRouter.put('/', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { requireApproval } = req.body || {};
    if (typeof requireApproval !== 'boolean') {
      return res.status(400).json({ message: 'requireApproval must be a boolean' });
    }

    await ensureSettingsRow();

    const updated = await (prisma as any).aiSettings.update({
      where: { id: 1 },
      data: { requireApproval },
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default settingsRouter;
