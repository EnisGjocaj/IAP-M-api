import { PrismaClient } from '@prisma/client';
import { supabase } from '../../supabase.config';

const prisma = new PrismaClient();

export class StudentProfileService {
  private readonly BUCKET_NAME = 'student-profile-images';

  async getStudentProfile(userId: string) {
    try {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: Number(userId) },
        include: {
          user: true,
          skills: true,
          badges: true,
          trainings: true,
          testimonials: true,
          academicSubjects: true,
        },
      });

      if (!profile) {
        return { statusCode: 404, message: 'Student profile not found' };
      }

      return { statusCode: 200, message: profile };
    } catch (error: any) {
      return { statusCode: 500, message: 'Internal server error' };
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

  // Modify updateStudentProfile to handle image upload
  async updateStudentProfile(userId: string, data: {
    name?: string;
    email?: string;
    university?: string;
    faculty?: string;
    year?: string;
    gpa?: number;
    bio?: string;
    location?: string;
    phoneNumber?: string;
    linkedinUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
    profileImage?: Express.Multer.File;
    attendance?: number;
    totalCredits?: number;
  }) {
    try {
      console.log('Service received data:', data);

      let imageUrl;
      if (data.profileImage) {
        imageUrl = await this.uploadImage(data.profileImage);
      }

      // Create clean update data object
      const updateData: any = {};

      // Explicitly map each field
      if (data.university) updateData.university = data.university;
      if (data.faculty) updateData.faculty = data.faculty;
      if (data.year) updateData.year = data.year;
      if (data.bio) updateData.bio = data.bio;
      if (data.location) updateData.location = data.location;
      if (data.phoneNumber) updateData.phoneNumber = data.phoneNumber;
      if (data.linkedinUrl) updateData.linkedinUrl = data.linkedinUrl;
      if (data.githubUrl) updateData.githubUrl = data.githubUrl;
      if (data.portfolioUrl) updateData.portfolioUrl = data.portfolioUrl;
      if (data.gpa) updateData.gpa = parseFloat(data.gpa.toString());
      if (data.attendance) updateData.attendance = parseFloat(data.attendance.toString());
      if (data.totalCredits) updateData.totalCredits = parseInt(data.totalCredits.toString());
      if (imageUrl) updateData.profileImage = imageUrl;

      console.log('Clean update data:', updateData);

      // Update user information if provided
      if (data.name || data.email) {
        await prisma.user.update({
          where: { id: Number(userId) },
          data: {
            name: data.name,
            email: data.email,
          },
        });
      }

      // Update student profile
      const updatedProfile = await prisma.studentProfile.update({
        where: { userId: Number(userId) },
        data: updateData,
        include: {
          user: true,
          skills: true,
          badges: true,
          trainings: true,
          testimonials: true,
          academicSubjects: true,
        },
      });

      console.log('Profile updated successfully:', updatedProfile);

      return { statusCode: 200, message: updatedProfile };
    } catch (error: any) {
      console.error('Error in updateStudentProfile:', error);
      return { statusCode: 500, message: error.message || 'Internal server error' };
    }
  }

  // Skills management
  async addSkill(userId: string, data: { name: string; level: number }) {
    try {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: Number(userId) },
      });

      if (!profile) {
        return { statusCode: 404, message: 'Student profile not found' };
      }

      const skill = await prisma.studentSkill.create({
        data: {
          ...data,
          profileId: profile.id,
        },
      });

      return { statusCode: 201, message: skill };
    } catch (error: any) {
      return { statusCode: 500, message: 'Internal server error' };
    }
  }

  // Badges management
  async addBadge(userId: string, data: { name: string; type: string; date: Date }) {
    try {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: Number(userId) },
      });

      if (!profile) {
        return { statusCode: 404, message: 'Student profile not found' };
      }

      const badge = await prisma.studentBadge.create({
        data: {
          ...data,
          profileId: profile.id,
        },
      });

      return { statusCode: 201, message: badge };
    } catch (error: any) {
      return { statusCode: 500, message: 'Internal server error' };
    }
  }

  // Training management
  async addTraining(userId: string, data: {
    title: string;
    category: string;
    level: string;
    instructor: string;
    hours?: number;
    completionDate?: Date;
    startDate?: Date;
    status: string;
    progress?: number;
    certificate: boolean;
  }) {
    try {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: Number(userId) },
      });

      if (!profile) {
        return { statusCode: 404, message: 'Student profile not found' };
      }

      const training = await prisma.studentTraining.create({
        data: {
          ...data,
          profileId: profile.id,
        },
      });

      return { statusCode: 201, message: training };
    } catch (error: any) {
      return { statusCode: 500, message: 'Internal server error' };
    }
  }

  async addAcademicSubject(userId: string, data: {
    name: string;
    grade: string;
    credits: number;
    semester: string;
  }) {
    try {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: Number(userId) },
      });

      if (!profile) {
        return { statusCode: 404, message: 'Student profile not found' };
      }

      const subject = await prisma.studentSubject.create({
        data: {
          ...data,
          profileId: profile.id,
        },
      });

      return { statusCode: 201, message: subject };
    } catch (error: any) {
      return { statusCode: 500, message: 'Internal server error' };
    }
  }
}