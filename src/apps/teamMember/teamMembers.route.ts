import express, { Request, Response, NextFunction } from 'express';
import { TeamMemberService } from './teamMember.service';
import multer from 'multer';
import path from 'path';
import { MediaService } from '../media/media.service';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 });
const teamMemberRouter = express.Router();
const teamMemberService = new TeamMemberService();
const mediaService = new MediaService();


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

const upload = multer({ storage: multer.memoryStorage() });

teamMemberRouter.get('/', async (req: Request, res: Response) => {
    try {
        const cacheKey = 'team-members-list';
        const cachedData = cache.get(cacheKey);
        
        if (cachedData) {
            res.json(cachedData);
            
            const freshData = await teamMemberService.getAllTeamMembers();
            cache.set(cacheKey, freshData.message);
            console.log("Cache updated with fresh data");
        } else {
            const teamMembers = await teamMemberService.getAllTeamMembers();
            cache.set(cacheKey, teamMembers.message);
            res.json(teamMembers.message);
        }
    } catch (error) {
        console.error('Error fetching team members:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

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

teamMemberRouter.post('/', upload.single('image'), async (req: Request, res: Response) => {
    try {
        const {
            fullName, role, description, title, email, phoneNumber,
            linkedinUrl, twitterUrl, facebookUrl, cvPath
        } = req.body;

        const teamMember = await teamMemberService.createTeamMember({
            fullName,
            role,
            description,
            title,
            email,
            phoneNumber,
            linkedinUrl,
            twitterUrl,
            facebookUrl,
            cvPath,
            image: req.file
        });

        return res.status(teamMember.statusCode).json(teamMember.message);
    } catch (error) {
        console.error('Error creating team member:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

teamMemberRouter.put('/:id', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'cv', maxCount: 1 }
]), async (req: Request, res: Response) => {
    try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        let imagePath: string | undefined = undefined;
        let cvPath: string | undefined = undefined;

        if (files && files['image'] && files['image'][0]) {
            imagePath = await teamMemberService.uploadImage(files['image'][0]);
        }

        if (files && files['cv'] && files['cv'][0]) {

        }

        const { fullName, role, description, title, linkedinUrl, twitterUrl, facebookUrl, email, phoneNumber } = req.body;

        const updateData: any = { fullName, role, description, title, linkedinUrl, twitterUrl, facebookUrl, email, phoneNumber };
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

teamMemberRouter.delete('/:id', async (req: Request, res: Response) => {
    try {
        console.log('Delete request received for ID:', req.params.id);
        
        const result = await teamMemberService.deleteTeamMember(req.params.id);
        console.log('Delete operation result:', result);
        
        return res.status(result.statusCode).json({
            success: result.statusCode === 200,
            message: result.message
        });
    } catch (error) {
        console.error('Error in delete route:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

export default teamMemberRouter;
