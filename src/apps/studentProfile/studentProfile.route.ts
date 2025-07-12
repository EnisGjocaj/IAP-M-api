import express, { Request, Response } from 'express';
import { StudentProfileService } from './studentProfile.service';
import { authenticateJWT } from '../middleware/authMiddleware';
import { authenticateStudent } from '../middleware/studentAuthMiddleware';
import multer from 'multer';

const studentProfileService = new StudentProfileService();
const studentProfileRouter = express.Router();

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// All routes should be protected for students only
studentProfileRouter.use(authenticateStudent);

// Get student profile
studentProfileRouter.get('/:userId', async (req: Request, res: Response) => {
  try {
    const result = await studentProfileService.getStudentProfile(req.params.userId);
    return res.status(result.statusCode).json(result.message);
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

studentProfileRouter.put('/:userId', 
  upload.single('profileImage'),
  async (req: Request, res: Response) => {
    try {
      // Log incoming request
      console.log('Received update request:', {
        body: req.body,
        file: req.file,
        params: req.params
      });

      const updateData = {
        ...req.body,
        profileImage: req.file,
        // Convert numeric fields properly
        gpa: req.body.gpa ? parseFloat(req.body.gpa) : undefined,
        attendance: req.body.attendance ? parseFloat(req.body.attendance) : undefined,
        totalCredits: req.body.totalCredits ? parseInt(req.body.totalCredits) : undefined,
        // Make sure these fields are included
        university: req.body.university || undefined,
        faculty: req.body.faculty || undefined,
        year: req.body.year || undefined,
        bio: req.body.bio || undefined,
        location: req.body.location || undefined,
        phoneNumber: req.body.phoneNumber || undefined,
        linkedinUrl: req.body.linkedinUrl || undefined,
        githubUrl: req.body.githubUrl || undefined,
        portfolioUrl: req.body.portfolioUrl || undefined,
      };

      console.log('Processed update data:', updateData);

      const result = await studentProfileService.updateStudentProfile(req.params.userId, updateData);
      
      // Log the result
      console.log('Update result:', result);
      
      return res.status(result.statusCode).json(result.message);
    } catch (error: any) {
      console.error('Error updating student profile:', error);
      return res.status(500).json({ message: 'Internal server error', error: error.message });
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
