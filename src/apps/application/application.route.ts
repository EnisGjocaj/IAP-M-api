import express, { Request, Response } from 'express';
import { ApplicationService } from './application.service';

const applicationService = new ApplicationService();
const applicationRouter = express.Router();

// Get all applications
applicationRouter.get('/', async (req: Request, res: Response) => {
  try {
    const applications = await applicationService.getAllApplications();
    return res.status(200).json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get application by ID
applicationRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const application = await applicationService.getApplicationById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    return res.status(200).json(application);
  } catch (error) {
    console.error('Error fetching application:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create application
applicationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const newApplication = await applicationService.createApplication(req.body);
    return res.status(201).json(newApplication);
  } catch (error) {
    console.error('Error creating application:', error);
    return res.status(500).json({ message: 'Error creating application' });
  }
});

// Update application
applicationRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const updatedApplication = await applicationService.updateApplication(req.params.id, req.body);
    return res.status(200).json(updatedApplication);
  } catch (error) {
    console.error('Error updating application:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete application
applicationRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await applicationService.deleteApplication(req.params.id);
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting application:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default applicationRouter;
