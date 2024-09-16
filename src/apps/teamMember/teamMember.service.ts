// teamMember.service.ts
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';

const prisma = new PrismaClient();

export class TeamMemberService {
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
      const teamMember = await prisma.teamMember.findUnique({ where: { id: Number(teamMemberId) } });
      if (!teamMember) {
        return { statusCode: 404, message: 'Team member not found' };
      }
      return { statusCode: 200, message: teamMember };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }


  async createTeamMember(data: { fullName: string; role: string; description: string; title: string; imagePath?: string }) {
    try {
        // Log data to ensure correct values are passed
        console.log(data);

        const newTeamMember = await prisma.teamMember.create({
            data: {
                fullName: data.fullName,  // Ensure this is a string value
                role: data.role || '',  // Fallback to empty string if undefined
                description: data.description || '',  // Fallback
                title: data.title || '',  // Fallback
                imagePath: data.imagePath ?? '',  // Handle optional imagePath correctly
            },
        });
        return { statusCode: 201, message: newTeamMember };
    } catch (error: any) {
        return { statusCode: 500, message: error.message };
    }
}



  // async updateTeamMember(teamMemberId: string, data: { fullName?: string; role?: string; description?: string; title?: string; imagePath?: string }) {
  //   try {
  //     const updatedTeamMember = await prisma.teamMember.update({
  //       where: { id: Number(teamMemberId) },
  //       data,
  //     });
  //     return { statusCode: 200, message: updatedTeamMember };
  //   } catch (error: any) {
  //     throw new Error(`Error updating team member: ${error.message}`);
  //   }
  // }


  async updateTeamMember(teamMemberId: string, data: { fullName?: string; role?: string; description?: string; title?: string; imagePath?: string }) {
    try {
      const updateData: any = {};
      if (data.fullName !== undefined) updateData.fullName = data.fullName;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.title !== undefined) updateData.title = data.title;
      if (data.imagePath !== undefined) updateData.imagePath = data.imagePath;
  
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
      const deletedTeamMember = await prisma.teamMember.delete({
        where: { id: Number(teamMemberId) },
      });
      return { statusCode: 200, message: deletedTeamMember };
    } catch (error: any) {
      throw new Error(`Error deleting team member: ${error.message}`);
    }
  }
}
