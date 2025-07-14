import express, { Request, Response } from 'express';
import { StudentProfileService } from './studentProfile.service';
import { authenticateJWT } from '../middleware/authMiddleware';
import multer from 'multer';

const studentProfileRouter = express.Router();
const studentProfileService = new StudentProfileService();

studentProfileRouter.use(authenticateJWT);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
   
    if (file.fieldname === 'cv') {
      if (file.mimetype === 'application/pdf' || 
          file.mimetype === 'application/msword' || 
          file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        cb(null, true);
      } else {
        cb(null, false);
      }
    }
    // Accept image files
    else if (file.fieldname === 'profileImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    } else {
      cb(null, false);
    }
  }
});

// Get student profile
studentProfileRouter.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const result = await studentProfileService.getStudentProfile(userId);
    res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Add this new route
studentProfileRouter.get('/', async (req: Request, res: Response) => {
  try {
    const result = await studentProfileService.getAllStudentProfiles();
    res.status(result.statusCode).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update to handle both file uploads and regular updates
studentProfileRouter.put('/:userId', 
  authenticateJWT,
  upload.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 }
  ]),
  async (req: Request, res: Response) => {
    try {
      console.log('Update request received:', {
        body: req.body,
        files: req.files,
        params: req.params
      });

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      const updateData = {
        ...req.body,
        cv: files?.cv?.[0],
        profileImage: files?.profileImage?.[0]
      };

      const result = await studentProfileService.updateStudentProfile(
        req.params.userId, 
        updateData
      );

      return res.status(result.statusCode).json(result.message);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ 
        message: 'Internal server error', 
        error: error.message 
      });
    }
  }
);

// Add skill
studentProfileRouter.post('/:userId/skills', async (req: Request, res: Response) => {
  try {
    const result = await studentProfileService.addSkill(req.params.userId, req.body);
    return res.status(result.statusCode).json(result.message);
  } catch (error) {
    console.error('Error adding skill:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Add badge
studentProfileRouter.post('/:userId/badges', async (req: Request, res: Response) => {
  try {
    const result = await studentProfileService.addBadge(req.params.userId, req.body);
    return res.status(result.statusCode).json(result.message);
  } catch (error) {
    console.error('Error adding badge:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Add training
studentProfileRouter.post('/:userId/trainings', async (req: Request, res: Response) => {
  try {
    const result = await studentProfileService.addTraining(req.params.userId, req.body);
    return res.status(result.statusCode).json(result.message);
  } catch (error) {
    console.error('Error adding training:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Add academic subject
studentProfileRouter.post('/:userId/subjects', async (req: Request, res: Response) => {
  try {
    const result = await studentProfileService.addAcademicSubject(req.params.userId, req.body);
    return res.status(result.statusCode).json(result.message);
  } catch (error) {
    console.error('Error adding academic subject:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default studentProfileRouter;
