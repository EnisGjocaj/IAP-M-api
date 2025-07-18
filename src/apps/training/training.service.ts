import { PrismaClient, TrainingStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class TrainingService {
  // Get all trainings
  async getAllTrainings() {
    try {
      const trainings = await prisma.training.findMany({
        include: {
          enrollments: true,
        },
      });
      return { statusCode: 200, message: trainings };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  // Get single training
  async getTraining(id: string) {
    try {
      const training = await prisma.training.findUnique({
        where: { id: Number(id) },
        include: {
          enrollments: true,
        },
      });

      if (!training) {
        return { statusCode: 404, message: 'Training not found' };
      }

      return { statusCode: 200, message: training };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  // Create training
  async createTraining(data: {
    title: string;
    description?: string;
    category: string;
    level: string;
    instructor: string;
    totalHours: number;
    startDate: Date;
    endDate: Date;
    maxParticipants?: number;
    isActive: boolean;
  }) {
    try {
      const training = await prisma.training.create({
        data: data,
      });
      return { statusCode: 201, message: training };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  // Update training
  async updateTraining(id: string, data: {
    title?: string;
    description?: string;
    category?: string;
    level?: string;
    instructor?: string;
    totalHours?: number;
    startDate?: Date;
    endDate?: Date;
    maxParticipants?: number;
    isActive?: boolean;
  }) {
    try {
      const training = await prisma.training.update({
        where: { id: Number(id) },
        data: data,
      });
      return { statusCode: 200, message: training };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  // Delete training
  async deleteTraining(id: string) {
    try {
      await prisma.training.delete({
        where: { id: Number(id) },
      });
      return { statusCode: 200, message: 'Training deleted successfully' };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  // Enroll student in training
  async enrollStudent(trainingId: string, profileId: string) {
    try {
      const profile = await prisma.studentProfile.findUnique({
        where: { id: Number(profileId) },
        include: { user: true }
      });

      if (!profile) {
        return { 
          statusCode: 404, 
          message: 'Student profile not found' 
        };
      }

      const existingEnrollment = await prisma.studentTrainingEnrollment.findUnique({
        where: {
          trainingId_profileId: {
            trainingId: Number(trainingId),
            profileId: Number(profileId)
          }
        }
      });

      if (existingEnrollment) {
        return {
          statusCode: 400,
          message: 'Student is already enrolled in this training'
        };
      }

      const enrollment = await prisma.studentTrainingEnrollment.create({
        data: {
          trainingId: Number(trainingId),
          profileId: Number(profileId),
          status: TrainingStatus.ENROLLED,
          progress: 0,
          enrollmentDate: new Date(),
        },
      });
      return { statusCode: 201, message: enrollment };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async updateEnrollmentStatus(
    trainingId: string,
    profileId: string,
    data: {
      status?: TrainingStatus;
      progress?: number;
      completionDate?: Date;
      certificateUrl?: string;
      attendance?: number;
      grade?: number;
      feedback?: string;
      rating?: number;
    }
  ) {
    try {
      const grade = data.rating ? data.rating * 20 : data.grade;

      const result = await prisma.$transaction(async (prisma) => {
        const studentProfile = await prisma.studentProfile.findUnique({
          where: { id: Number(profileId) },
          include: {
            featuredStudent: true
          }
        });

        console.log('Found student profile:', {
          profileId,
          featuredStudentId: studentProfile?.featuredStudent?.id
        });

        const enrollment = await prisma.studentTrainingEnrollment.update({
          where: {
            trainingId_profileId: {
              trainingId: Number(trainingId),
              profileId: Number(profileId),
            },
          },
          data: {
            feedback: data.feedback,
            grade: grade,
            ...(data.status && { status: data.status }),
            ...(data.progress && { progress: data.progress }),
            ...(data.completionDate && { completionDate: data.completionDate }),
            ...(data.certificateUrl && { certificateUrl: data.certificateUrl }),
            ...(data.attendance && { attendance: data.attendance }),
            updatedAt: new Date()
          },
        });

        if (data.rating) {
          const review = await prisma.trainingReview.upsert({
            where: {
              trainingId_studentProfileId: {
                trainingId: Number(trainingId),
                studentProfileId: Number(profileId)
              }
            },
            update: {
              rating: data.rating,
              content: data.feedback || '',
              featuredStudentId: studentProfile?.featuredStudent?.id
            },
            create: {
              trainingId: Number(trainingId),
              studentProfileId: Number(profileId),
              rating: data.rating,
              content: data.feedback || '',
              featuredStudentId: studentProfile?.featuredStudent?.id
            }
          });

          console.log('Created/Updated review:', review);
        }

        return enrollment;
      });

      return { statusCode: 200, message: result };
    } catch (error: any) {
      console.error('Error updating enrollment:', error);
      return { statusCode: 500, message: error.message };
    }
  }

  async getTrainingEnrollments(trainingId: string) {
    try {
      console.log('Fetching enrollments for training ID:', trainingId);
      const training = await prisma.training.findUnique({
        where: { id: Number(trainingId) }
      });

      if (!training) {
        return { statusCode: 404, message: 'Training not found' };
      }

      const enrollments = await prisma.studentTrainingEnrollment.findMany({
        where: { 
          trainingId: Number(trainingId) 
        },
        include: {
          profile: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              
              trainingReviews: {
                where: {
                  trainingId: Number(trainingId)
                }
              }
            }
          },
          training: true 
        },
        orderBy: {
          enrollmentDate: 'desc'
        }
      }) || [];

     
      const enrollmentsWithReviews = enrollments.map(enrollment => ({
        ...enrollment,
        trainingReviews: enrollment.profile?.trainingReviews || []
      }));

      const now = new Date();
      const startDate = training.startDate ? new Date(training.startDate) : now;
      const endDate = training.endDate ? new Date(training.endDate) : now;

      const enrollmentsWithStatus = enrollmentsWithReviews.map(enrollment => ({
        ...enrollment,
        calculatedStatus: !training.isActive ? "INACTIVE" :
                         now < startDate ? "UPCOMING" :
                         now > endDate ? "COMPLETED" : "IN_PROGRESS"
      }));
      
      console.log('Found enrollments:', enrollmentsWithStatus);
      return { statusCode: 200, message: enrollmentsWithStatus };
    } catch (error: any) {
      console.error('Error in getTrainingEnrollments:', error);
      return { statusCode: 500, message: error.message };
    }
  }

  async createTrainingReview(
    trainingId: string,
    studentProfileId: string,
    data: {
      content: string;
      rating: number;
      featuredStudentId?: number;
    }
  ) {
    try {
      const review = await prisma.trainingReview.create({
        data: {
          content: data.content,
          rating: data.rating,
          trainingId: Number(trainingId),
          studentProfileId: Number(studentProfileId),
          featuredStudentId: data.featuredStudentId
        },
        include: {
          training: true,
          studentProfile: {
            include: {
              user: true
            }
          }
        }
      });
      return { statusCode: 201, message: review };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async getTrainingReviews(trainingId: string) {
    try {
      const reviews = await prisma.trainingReview.findMany({
        where: {
          trainingId: Number(trainingId)
        },
        include: {
          studentProfile: {
            include: {
              user: true
            }
          },
          featuredStudent: true
        }
      });
      return { statusCode: 200, message: reviews };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async getStudentTrainingReviews(studentProfileId: string) {
    try {
      const reviews = await prisma.trainingReview.findMany({
        where: {
          studentProfileId: Number(studentProfileId)
        },
        include: {
          training: {
            select: {
              title: true,
              category: true,
              level: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return { 
        statusCode: 200, 
        message: reviews 
      };
    } catch (error: any) {
      console.error('Error fetching student reviews:', error);
      return { 
        statusCode: 500, 
        message: error.message 
      };
    }
  }
} 