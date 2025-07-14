import express, { Request, Response } from 'express';
import { FeaturedStudentService } from './featuredStudent.service';
import { authenticateJWT } from '../middleware/authMiddleware';
import multer from 'multer';

const featuredStudentService = new FeaturedStudentService();
const featuredStudentRouter = express.Router();

// Setup multer for image uploads
const upload = multer({ storage: multer.memoryStorage() });

// Get all featured students
featuredStudentRouter.get('/', async (req: Request, res: Response) => {
  try {
    const result = await featuredStudentService.getAllFeaturedStudents();
    return res.status(result.statusCode).json(result.message);
  } catch (error) {
    console.error('Error fetching featured students:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get featured student by ID
featuredStudentRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    console.log('Fetching student with ID:', req.params.id); 
    const result = await featuredStudentService.getFeaturedStudentById(req.params.id);
    console.log('Service result:', result); 
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Error in route handler:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create featured student (protected route)
featuredStudentRouter.post('/', upload.single('image'), authenticateJWT, async (req: Request, res: Response) => {
  try {
    console.log('Raw request body:', req.body);
    console.log('Raw achievements:', req.body.achievements);

    // Parse achievements from the request body
    let achievements = [];
    if (req.body.achievements) {
      try {
        achievements = JSON.parse(req.body.achievements);
        if (!Array.isArray(achievements)) {
          achievements = [achievements];
        }
      } catch (error) {
        console.error('Error parsing achievements:', error);
        achievements = req.body.achievements
          .split(',')
          .map((item: string) => item.trim())
          .filter((item: string) => item.length > 0);
      }
    }

    console.log('Parsed achievements:', achievements);

    const data = {
      ...req.body,
      achievements, 
      image: req.file
    };

    const result = await featuredStudentService.createFeaturedStudent(data);
    return res.status(result.statusCode).json(result.message);
  } catch (error) {
    console.error('Error in route handler:', error);
    return res.status(500).json({ message: 'Error creating featured student' });
  }
});

featuredStudentRouter.put('/:id', authenticateJWT, upload.single('image'), async (req: Request, res: Response) => {
  try {
    
    let achievements = [];
    if (req.body.achievements) {
      try {
        achievements = JSON.parse(req.body.achievements);
        if (!Array.isArray(achievements)) {
          achievements = [achievements];
        }
      } catch (error) {
        console.error('Error parsing achievements:', error);
        achievements = req.body.achievements
          .split(',')
          .map((item: string) => item.trim())
          .filter((item: string) => item.length > 0);
      }
    }

    const data = {
      ...req.body,
      achievements, 
      image: req.file
    };

    const result = await featuredStudentService.updateFeaturedStudent(req.params.id, data);
    return res.status(result.statusCode).json(result.message);
  } catch (error) {
    console.error('Error updating featured student:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete featured student (protected route)
featuredStudentRouter.delete('/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const result = await featuredStudentService.deleteFeaturedStudent(req.params.id);
    return res.status(result.statusCode).json(result.message);
  } catch (error) {
    console.error('Error deleting featured student:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get featured students by course type
featuredStudentRouter.get('/course/:courseType', async (req: Request, res: Response) => {
  try {
    const result = await featuredStudentService.getFeaturedStudentsByCourse(req.params.courseType as any);
    return res.status(result.statusCode).json(result.message);
  } catch (error) {
    console.error('Error fetching students by course:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get top performing students
featuredStudentRouter.get('/top/:limit?', async (req: Request, res: Response) => {
  try {
    const limit = req.params.limit ? parseInt(req.params.limit) : undefined;
    const result = await featuredStudentService.getTopPerformingStudents(limit);
    return res.status(result.statusCode).json(result.message);
  } catch (error) {
    console.error('Error fetching top students:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


featuredStudentRouter.get('/:id/cv', async (req: Request, res: Response) => {
  try {
    const result = await featuredStudentService.getStudentProfileCV(req.params.id);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error('Error fetching student CV:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default featuredStudentRouter; 