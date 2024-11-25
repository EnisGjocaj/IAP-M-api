import { Router, Request, Response } from 'express';
import { container } from 'tsyringe';
import { JobListingService } from './jobListing.service';
import { JobType } from '@prisma/client';
import { UpdateJobListingDto } from './jobListing.dto';

type SortBy = 'recent' | 'salaryHighToLow' | 'salaryLowToHigh';

const isValidJobType = (type: string): type is JobType => {
  return ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'].includes(type);
};

const isValidSortBy = (sortBy: string): sortBy is SortBy => {
  return ['recent', 'salaryHighToLow', 'salaryLowToHigh'].includes(sortBy);
};

const router = Router();
const jobListingService = container.resolve(JobListingService);

// Get all job listings with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      page, 
      limit, 
      search, 
      type, 
      location, 
      sortBy,
      includeInactive
    } = req.query;

    // Validate type and sortBy
    const validatedType = type && typeof type === 'string' && isValidJobType(type) ? type : undefined;
    const validatedSortBy = sortBy && typeof sortBy === 'string' && isValidSortBy(sortBy) ? sortBy : undefined;

    const result = await jobListingService.getAllJobListings({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
      type: validatedType,
      location: location as string,
      sortBy: validatedSortBy,
      includeInactive: includeInactive === 'true',
    });

    res.json(result);
  } catch (error) {
    console.error('Error in job listings route:', error);
    res.status(500).json({ error: 'Failed to fetch job listings' });
  }
});

// Get a specific job listing
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    const result = await jobListingService.getJobListingById(id);
    res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(404).json({ success: false, message: errorMessage });
  }
});

// Create a new job listing (admin only)
router.post('/', async (req: Request, res: Response) => {
  try {
    const result = await jobListingService.createJobListing(req.body);
    res.status(201).json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ success: false, message: errorMessage });
  }
});

// Update a job listing (admin only)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid job listing ID' });
    }

    const updateData = req.body as UpdateJobListingDto;
    console.log(`Updating job listing ${id} with data:`, updateData);
    
    const result = await jobListingService.updateJobListing(id, updateData);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Job listing not found' });
    }
    
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error updating job listing:', error);
    return res.status(500).json({ success: false, message: errorMessage });
  }
});

// Delete a job listing (admin only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid job listing ID' });
    }

    const result = await jobListingService.deleteJobListing(id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Job listing not found' });
    }

    res.json({ success: true, message: 'Job listing deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ success: false, message: errorMessage });
  }
});

// Toggle job listing status (admin only)
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const result = await jobListingService.toggleJobListingStatus(Number(req.params.id));
    res.json(result);
  } catch (error:any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
