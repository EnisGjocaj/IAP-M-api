// teamMember.router.ts
import express, { Request, Response, NextFunction } from 'express';
import { TeamMemberService } from './teamMember.service';
import multer from 'multer';
import path from 'path';
import { MediaService } from '../media/media.service';
import upload from '../../multerConfig';

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
      const imagePath = req.file ? `/uploads/${req.file.filename}` : ''; // Image file path

      // Log to verify form data and image
      console.log('Form Data:', { fullName, role, description, title, imagePath });

      // You can use the media service here to handle file operations (optional)
      if (req.file) {
          await mediaService.uploadFile(req.file);
      }

      // Now create the team member with the file path
      const teamMember = await teamMemberService.createTeamMember({
          fullName,
          role,
          description,
          title,
          imagePath, // Associate the image path with the team member
      });

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
