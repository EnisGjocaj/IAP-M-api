import { PrismaClient, TrainingStatus, StudentTrainingEnrollment, Training } from '@prisma/client';
import { supabase } from '../../supabase.config';

type EnrollmentWithTraining = StudentTrainingEnrollment & {
  training: Training;
};

const prisma = new PrismaClient();

export class StudentProfileService {
  private readonly BUCKET_NAME = 'student-profile-images';
  private readonly CV_BUCKET_NAME = 'student-cvs';

  async getStudentProfile(userId: string) {
    try {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: Number(userId) },
        include: {
          user: true,
          skills: true,
          badges: true,
          trainings: {
            include: {
              training: true
            }
          },
          testimonials: true,
          academicSubjects: true,
        },
      });

      if (!profile) {
        return { statusCode: 404, message: 'Student profile not found' };
      }

      if (profile.trainings) {
        const transformedEnrollments = profile.trainings.map((enrollment: EnrollmentWithTraining) => {
          const training = enrollment.training;
          const now = new Date();
          const startDate = new Date(training.startDate);
          const endDate = new Date(training.endDate);

          let calculatedStatus: TrainingStatus;
          if (!training.isActive) {
            calculatedStatus = TrainingStatus.DROPPED;
          } else if (now < startDate) {
            calculatedStatus = TrainingStatus.ENROLLED;
          } else if (now > endDate) {
            calculatedStatus = TrainingStatus.COMPLETED;
          } else {
            calculatedStatus = TrainingStatus.IN_PROGRESS;
          }

          return {
            ...enrollment,
            status: calculatedStatus
          };
        });

        profile.trainings = transformedEnrollments;
      }

      return { statusCode: 200, message: profile };
    } catch (error: any) {
      console.error('Error in getStudentProfile:', error);
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

  // Add method to upload CV
  async uploadCV(file: Express.Multer.File) {
    try {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `cv-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(this.CV_BUCKET_NAME)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600'
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(this.CV_BUCKET_NAME)
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      throw new Error(`Error uploading CV: ${error.message}`);
    }
  }

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
    facebookUrl?: string;
    cv?: Express.Multer.File;
    profileImage?: Express.Multer.File;
    attendance?: number;
    totalCredits?: number;
  }) {
    try {
      console.log('Service received data:', data);

      let imageUrl;
      let cvUrl;

      if (data.profileImage) {
        imageUrl = await this.uploadImage(data.profileImage);
      }

      if (data.cv) {
        cvUrl = await this.uploadCV(data.cv);
      }

      const updateData: any = {};

      if (data.university) updateData.university = data.university;
      if (data.faculty) updateData.faculty = data.faculty;
      if (data.year) updateData.year = data.year;
      if (data.bio) updateData.bio = data.bio;
      if (data.location) updateData.location = data.location;
      if (data.phoneNumber) updateData.phoneNumber = data.phoneNumber;
      if (data.linkedinUrl) updateData.linkedinUrl = data.linkedinUrl;
      if (data.facebookUrl) updateData.facebookUrl = data.facebookUrl;
      if (data.gpa) updateData.gpa = parseFloat(data.gpa.toString());
      if (data.attendance) updateData.attendance = parseFloat(data.attendance.toString());
      if (data.totalCredits) updateData.totalCredits = parseInt(data.totalCredits.toString());
      if (imageUrl) updateData.profileImage = imageUrl;
      if (cvUrl) updateData.cvPath = cvUrl;

      if (data.name || data.email) {
        await prisma.user.update({
          where: { id: Number(userId) },
          data: {
            name: data.name,
            email: data.email,
          },
        });
      }

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

      return { statusCode: 200, message: updatedProfile };
    } catch (error: any) {
      console.error('Error in updateStudentProfile:', error);
      return { statusCode: 500, message: error.message };
    }
  }

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

  async getAllStudentProfiles() {
    try {
      const profiles = await prisma.studentProfile.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              surname: true,
              email: true,
              isStudent: true
            }
          },
          trainings: {
            select: {
              training: {
                select: {
                  id: true,
                  title: true
                }
              },
              status: true
            }
          }
        }
      });

      return { 
        statusCode: 200, 
        message: profiles 
      };
    } catch (error: any) {
      return { 
        statusCode: 500, 
        message: error.message 
      };
    }
  }
}