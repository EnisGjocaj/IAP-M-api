// src/routes/dashboard.router.ts
import express, { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';

const dashboardService = new DashboardService();
const dashboardRouter = express.Router();

// Get dashboard statistics
dashboardRouter.get('/statistics', async (req: Request, res: Response) => {
  try {
    const statistics = await dashboardService.getStatistics();
    return res.status(statistics.statusCode).json(statistics.message);
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get training application counts
dashboardRouter.get('/training-applications', async (req: Request, res: Response) => {
  try {
    const trainingApplications = await dashboardService.getTrainingApplications();
    return res.status(trainingApplications.statusCode).json(trainingApplications.message);
  } catch (error) {
    console.error('Error fetching training applications:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default dashboardRouter;
