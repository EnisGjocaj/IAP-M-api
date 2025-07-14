import { PrismaClient, TeamMemberRole } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { supabase } from '../../supabase.config'; 

const prisma = new PrismaClient();

export class TeamMemberService {
  private readonly BUCKET_NAME = 'team-member-images';

  async getAllTeamMembers() {
    try {
      const teamMembers = await prisma.teamMember.findMany();
      return { statusCode: 200, message: teamMembers };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async getTeamMemberById(teamMemberId: string) {
    try {
      console.log('Fetching team member with ID:', teamMemberId);
      const teamMember = await prisma.teamMember.findUnique({ 
        where: { id: Number(teamMemberId) } 
      });
      console.log('Found team member:', teamMember);
      
      if (!teamMember) {
        console.log('Team member not found');
        return { statusCode: 404, message: 'Team member not found' };
      }
      return { statusCode: 200, message: teamMember };
    } catch (error: any) {
      console.error('Error in getTeamMemberById:', error);
      return { statusCode: 500, message: error.message };
    }
  }

  async uploadImage(file: Express.Multer.File) {
    try {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600'
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      throw new Error(`Error uploading image: ${error.message}`);
    }
  }

  async createTeamMember(data: { 
    fullName: string; 
    role: TeamMemberRole;
    description: string; 
    title: string; 
    email?: string | null;
    phoneNumber?: string | null;
    linkedinUrl?: string | null;
    twitterUrl?: string | null;
    facebookUrl?: string | null;
    cvPath?: string | null;
    image?: Express.Multer.File
  }) {
    try {
      let imageUrl = '';
      if (data.image) {
        imageUrl = await this.uploadImage(data.image);
      }

      const {
        fullName,
        role,
        description,
        title,
        email,
        phoneNumber,
        linkedinUrl,
        twitterUrl,
        facebookUrl,
        cvPath
      } = data;

      const teamMember = await prisma.teamMember.create({
        data: {
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
          imagePath: imageUrl
        }
      });

      return {
        statusCode: 201,
        message: {
          ...teamMember,
          imagePath: imageUrl
        }
      };
    } catch (error: any) {
      throw new Error(`Error creating team member: ${error.message}`);
    }
  }

  async updateTeamMember(teamMemberId: string, data: { 
    fullName?: string; 
    role?: TeamMemberRole;
    description?: string; 
    title?: string; 
    imagePath?: string;
    cvPath?: string;
    email?: string;
    phoneNumber?: string;
    linkedinUrl?: string;
    twitterUrl?: string;
    facebookUrl?: string;
  }) {
    try {
      const updateData: any = {};
      if (data.fullName !== undefined) updateData.fullName = data.fullName;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.title !== undefined) updateData.title = data.title;
      if (data.imagePath !== undefined) updateData.imagePath = data.imagePath;
      if (data.cvPath !== undefined) updateData.cvPath = data.cvPath;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
      if (data.linkedinUrl !== undefined) updateData.linkedinUrl = data.linkedinUrl;
      if (data.twitterUrl !== undefined) updateData.twitterUrl = data.twitterUrl;
      if (data.facebookUrl !== undefined) updateData.facebookUrl = data.facebookUrl;
  
      const updatedTeamMember = await prisma.teamMember.update({
        where: { id: Number(teamMemberId) },
        data: updateData,
      });
      return { statusCode: 200, message: updatedTeamMember };
    } catch (error: any) {
      return { statusCode: 500, message: `Error updating team member: ${error.message}` };
    }
  }
  
  async deleteTeamMember(teamMemberId: string) {
    try {
      console.log('Attempting to delete team member with ID:', teamMemberId);
      
      const id = Number(teamMemberId);
      if (isNaN(id)) {
        return { statusCode: 400, message: 'Invalid ID format' };
      }

      const teamMember = await prisma.teamMember.findUnique({
        where: { id }
      });

      console.log('Found team member:', teamMember);

      if (!teamMember) {
        return { statusCode: 404, message: 'Team member not found' };
      }

      const deletedTeamMember = await prisma.teamMember.delete({
        where: { id }
      });
      
      console.log('Successfully deleted team member:', deletedTeamMember);
      return { statusCode: 200, message: deletedTeamMember };
    } catch (error: any) {
      console.error('Error in deleteTeamMember:', error);
      return { statusCode: 500, message: `Failed to delete team member: ${error.message}` };
    }
  }
}
