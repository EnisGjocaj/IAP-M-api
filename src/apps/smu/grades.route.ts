import { Router } from 'express';
import { GradesService } from './grades.service';
import { authenticateJWT } from '../middleware/authMiddleware';

const gradesRouter = Router();
const gradesService = new GradesService();

gradesRouter.post('/scrape-grades',  async (req, res) => {
  try {
    const { smuUsername, smuPassword } = req.body;

    if (!smuUsername || !smuPassword) {
      return res.status(400).json({
        success: false,
        error: 'SMU username and password are required'
      });
    }

    const result = await gradesService.scrapeGrades(smuUsername, smuPassword);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('Error in grades route:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default gradesRouter;