import express from 'express';
import multer from 'multer';

import { authenticateJWT, requireAdmin } from '../../apps/middleware/authMiddleware';
import { authenticateStudent } from '../../apps/middleware/studentAuthMiddleware';
import { ingestionService } from '../core/ai.container';
import { MaterialsService } from './materials.service';

const materialsRouter = express.Router();
const materialsService = new MaterialsService();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

materialsRouter.get('/', authenticateStudent, async (req, res) => {
  try {
    const userId = (req as any).user?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const result = await materialsService.listMyMaterials(userId);
    return res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

materialsRouter.get('/public', authenticateStudent, async (req, res) => {
  try {
    const userId = (req as any).user?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const result = await materialsService.listPublicMaterials();
    return res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

materialsRouter.post('/upload', authenticateStudent, upload.single('file'), async (req, res) => {
  try {
    const userId = (req as any).user?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { title, courseType, courseName, materialType, visibility } = req.body;

    const result = await materialsService.uploadMaterial(userId, {
      title,
      courseType,
      courseName,
      materialType,
      visibility,
      file: req.file,
    });

    return res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

materialsRouter.post('/:id/submit-for-approval', authenticateStudent, async (req, res) => {
  try {
    const userId = (req as any).user?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const result = await materialsService.submitForApproval(userId, req.params.id);
    return res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

materialsRouter.post('/:id/approve', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const adminId = (req as any).user?.userId as number | undefined;
    if (!adminId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const result = await materialsService.approveMaterial(adminId, req.params.id);
    return res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

materialsRouter.post('/:id/index', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const adminId = (req as any).user?.userId as number | undefined;
    if (!adminId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const materialId = Number(req.params.id);
    if (Number.isNaN(materialId)) {
      return res.status(400).json({ message: 'Invalid material id' });
    }

    await ingestionService.ingestMaterial(materialId);
    return res.status(200).json({ message: 'Indexed' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

materialsRouter.post('/:id/reject', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const adminId = (req as any).user?.userId as number | undefined;
    if (!adminId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { reason } = req.body;

    const result = await materialsService.rejectMaterial(adminId, req.params.id, reason);
    return res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default materialsRouter;
