import express, { Request, Response } from 'express';
import { TrainingService } from './training.service';
import { authenticateJWT } from '../middleware/authMiddleware';

const trainingRouter = express.Router();
const trainingService = new TrainingService();


trainingRouter.use(authenticateJWT);

// Get all trainings
trainingRouter.get('/', async (req: Request, res: Response) => {
  console.log('Training GET route hit:', {
    url: req.url,
    method: req.method,
    headers: req.headers,
    path: req.path
  });
  
  try {
    const result = await trainingService.getAllTrainings();
    console.log('Training service response:', result);
    res.status(result.statusCode).json(result);
  } catch (error: any) {
    console.error('Error in training route:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single training
trainingRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await trainingService.getTraining(req.params.id);
    res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create training
trainingRouter.post('/', async (req: Request, res: Response) => {
  try {
    const result = await trainingService.createTraining(req.body);
    res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update training
trainingRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const result = await trainingService.updateTraining(req.params.id, req.body);
    res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Delete training
trainingRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await trainingService.deleteTraining(req.params.id);
    res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Enroll student in training
trainingRouter.post('/:trainingId/enroll/:profileId', async (req: Request, res: Response) => {
  try {
    const result = await trainingService.enrollStudent(req.params.trainingId, req.params.profileId);
    res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update enrollment status
trainingRouter.put('/:trainingId/enrollment/:profileId', async (req: Request, res: Response) => {
  try {
    const result = await trainingService.updateEnrollmentStatus(
      req.params.trainingId,
      req.params.profileId,
      req.body
    );
    res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get all enrollments for a training
trainingRouter.get('/:trainingId/enrollments', async (req: Request, res: Response) => {
  try {
    const result = await trainingService.getTrainingEnrollments(req.params.trainingId);
    res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create review
trainingRouter.post('/:trainingId/reviews', async (req: Request, res: Response) => {
  try {
    const { studentProfileId, content, rating, featuredStudentId } = req.body;
    const result = await trainingService.createTrainingReview(
      req.params.trainingId,
      studentProfileId,
      { content, rating, featuredStudentId }
    );
    res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get reviews for a training
trainingRouter.get('/:trainingId/reviews', async (req: Request, res: Response) => {
  try {
    const result = await trainingService.getTrainingReviews(req.params.trainingId);
    res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get reviews by student profile ID
trainingRouter.get('/reviews/student/:studentProfileId', async (req: Request, res: Response) => {
  try {
    const result = await trainingService.getStudentTrainingReviews(req.params.studentProfileId);
    res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default trainingRouter; 