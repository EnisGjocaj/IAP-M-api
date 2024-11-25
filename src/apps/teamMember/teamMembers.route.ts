// teamMember.router.ts
import express, { Request, Response, NextFunction } from 'express';
import { TeamMemberService } from './teamMember.service';
import multer from 'multer';
import path from 'path';
import { MediaService } from '../media/media.service';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
const teamMemberRouter = express.Router();
const teamMemberService = new TeamMemberService();
const mediaService = new MediaService();

// Configure multer for both image and CV uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = file.fieldname === 'cv' ? 'uploads/cvs' : 'uploads/images';
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'cv') {
            // Allow PDF files for CV
            if (file.mimetype === 'application/pdf') {
                cb(null, true);
            } else {
                cb(null, false);
            }
        } else if (file.fieldname === 'image') {
            // Allow common image formats
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(null, false);
            }
        }
    }
});

// Get all team members
teamMemberRouter.get('/', async (req: Request, res: Response) => {
    try {
        const cacheKey = 'team-members-list';
        const cachedData = cache.get(cacheKey);
        
        if (cachedData) {
            // Return cached data immediately
            res.json(cachedData);
            
            // Fetch fresh data asynchronously and update cache
            const freshData = await teamMemberService.getAllTeamMembers();
            cache.set(cacheKey, freshData.message);
            console.log("Cache updated with fresh data");
        } else {
            // No cache available, fetch data and cache it
            const teamMembers = await teamMemberService.getAllTeamMembers();
            cache.set(cacheKey, teamMembers.message);
            res.json(teamMembers.message);
        }
    } catch (error) {
        console.error('Error fetching team members:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Get team member by ID
teamMemberRouter.get('/:id', async (req: Request, res: Response) => {
    try {
        const teamMember = await teamMemberService.getTeamMemberById(req.params.id);
        if (teamMember.statusCode === 404) {
            return res.status(404).json({ message: 'Team member not found' });
        }
        return res.status(teamMember.statusCode).json(teamMember.message);
    } catch (error) {
        console.error('Error fetching team member:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

teamMemberRouter.post('/', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'cv', maxCount: 1 }
]), async (req: Request, res: Response) => {
    try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const imagePath = files['image'] ? `/uploads/images/${files['image'][0].filename}` : '';
        const cvPath = files['cv'] ? `/uploads/cvs/${files['cv'][0].filename}` : '';

        const { fullName, role, description, title, linkedinUrl, twitterUrl, facebookUrl } = req.body;

        const teamMember = await teamMemberService.createTeamMember({
            fullName,
            role,
            description,
            title,
            imagePath,
            cvPath,
            linkedinUrl,
            twitterUrl,
            facebookUrl,
        });

        return res.status(teamMember.statusCode).json(teamMember.message);
    } catch (error) {
        console.error('Error creating team member:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Update team member
teamMemberRouter.put('/:id', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'cv', maxCount: 1 }
]), async (req: Request, res: Response) => {
    try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const imagePath = files['image'] ? `/uploads/images/${files['image'][0].filename}` : undefined;
        const cvPath = files['cv'] ? `/uploads/cvs/${files['cv'][0].filename}` : undefined;

        const { fullName, role, description, title, linkedinUrl, twitterUrl, facebookUrl } = req.body;

        const updateData: any = { fullName, role, description, title, linkedinUrl, twitterUrl, facebookUrl };
        if (imagePath) {
            updateData.imagePath = imagePath;
        }
        if (cvPath) {
            updateData.cvPath = cvPath;
        }

        const updatedTeamMember = await teamMemberService.updateTeamMember(req.params.id, updateData);
        return res.status(updatedTeamMember.statusCode).json(updatedTeamMember.message);
    } catch (error) {
        console.error('Error updating team member:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete team member
teamMemberRouter.delete('/:id', async (req: Request, res: Response) => {
    try {
        await teamMemberService.deleteTeamMember(req.params.id);
        return res.status(204).send();
    } catch (error) {
        console.error('Error deleting team member:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

export default teamMemberRouter;
