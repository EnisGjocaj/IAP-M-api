import express from 'express';

import { PrismaClient } from '@prisma/client';
import { authenticateJWT, requireAdmin } from '../../apps/middleware/authMiddleware';
import { authenticateStudent } from '../../apps/middleware/studentAuthMiddleware';

const prisma = new PrismaClient();
const settingsRouter = express.Router();

const ensureSettingsRow = async () => {
  return (prisma as any).aiSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      requireApproval: true,
      aiEnabled: true,
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
    const { requireApproval, aiEnabled } = req.body || {};
    const hasRequireApproval = typeof requireApproval === 'boolean';
    const hasAiEnabled = typeof aiEnabled === 'boolean';

    if (!hasRequireApproval && !hasAiEnabled) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    await ensureSettingsRow();

    const data: any = {};
    if (hasRequireApproval) data.requireApproval = requireApproval;
    if (hasAiEnabled) data.aiEnabled = aiEnabled;

    const updated = await (prisma as any).aiSettings.update({
      where: { id: 1 },
      data,
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

settingsRouter.get('/status', authenticateStudent, async (req, res) => {
  try {
    const settings = await ensureSettingsRow();
    return res.status(200).json({ aiEnabled: Boolean((settings as any)?.aiEnabled) });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default settingsRouter;
