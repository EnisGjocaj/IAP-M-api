// teamMember.router.ts
import express, { Request, Response, NextFunction } from 'express';
import { TeamMemberService } from './teamMember.service';
import multer from 'multer';
import path from 'path';
import { MediaService } from '../media/media.service';
import upload from '../../multerConfig';

import { v2 as cloudinary } from 'cloudinary';

const teamMemberService = new TeamMemberService();
const teamMemberRouter = express.Router();

const mediaService = new MediaService();


// Get all team members
teamMemberRouter.get('/', async (req: Request, res: Response) => {
  try {
    const teamMembers = await teamMemberService.getAllTeamMembers();
    return res.status(teamMembers.statusCode).json(teamMembers.message);
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

teamMemberRouter.post('/', upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, role, description, title } = req.body; // Form fields

    // Initialize imagePath to an empty string
    let imagePath = '';

    // If an image file is uploaded, upload it to Cloudinary
    if (req.file) {
      // Upload the file to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path);
      
      // If the upload is successful, use the Cloudinary URL as the imagePath
      imagePath = result.secure_url;
    }

    // Log to verify form data and image URL
    console.log('Form Data:', { fullName, role, description, title, imagePath });

    // Create the team member with the Cloudinary image URL
    const teamMemberService = new TeamMemberService();
    const teamMember = await teamMemberService.createTeamMember({
      fullName,
      role,
      description,
      title,
      imagePath, // Associate the Cloudinary URL with the team member
    });

    // Respond with the created team member's status and message
    return res.status(teamMember.statusCode).json(teamMember.message);
  } catch (error) {
    console.error('Error creating team member:', error);
    return res.status(500).json({ message: 'Error creating team member' });
  }
});
  
// teamMemberRouter.put('/:id', async (req: Request, res: Response) => {
//   try {
//     const updatedTeamMember = await teamMemberService.updateTeamMember(req.params.id, req.body);
//     return res.status(updatedTeamMember.statusCode).json(updatedTeamMember.message);
//   } catch (error) {
//     console.error('Error updating team member:', error);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// });
// Update team member
teamMemberRouter.put('/:id', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { fullName, role, description, title } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : undefined; // Set imagePath only if an image is uploaded

    // Create an object with fields to update
    const updateData: any = { fullName, role, description, title };
    if (imagePath) {
      updateData.imagePath = imagePath;
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
