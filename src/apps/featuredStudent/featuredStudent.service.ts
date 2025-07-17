import { PrismaClient, CourseType } from '@prisma/client';
import { supabase } from '../../supabase.config';

const prisma = new PrismaClient();

interface FeaturedStudentData {
  name: string;
  surname: string;
  email: string;
  phoneNumber?: string;
  courseType: CourseType;
  score: number;
  imagePath?: string;
  description: string;
  achievements: string[];
  graduationDate: Date;
  linkedinUrl?: string;
  testimonial?: string;
  isActive?: boolean | string;
  cvPath?: string; 
  studentProfileId?: number;
}

export class FeaturedStudentService {
  private readonly BUCKET_NAME = 'featured-student-images';

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

  async getAllFeaturedStudents() {
    try {
      const featuredStudents = await prisma.featuredStudent.findMany({
        where: {
          isActive: true
        },
        include: {
          studentProfile: {
            select: {
              cvPath: true,
              trainings: {
                select: {
                  grade: true
                }
              },
              user: {
                select: {
                  email: true
                }
              }
            }
          },
          trainingReviews: {
            include: {
              training: {
                select: {
                  title: true,
                  category: true,
                  level: true
                }
              }
            }
          }
        }
      });

      for (const student of featuredStudents) {
        if (!student.studentProfileId) {
          // Find student profile by email
          const studentProfile = await prisma.studentProfile.findFirst({
            where: {
              user: {
                email: student.email
              }
            }
          });

          if (studentProfile) {
            await prisma.featuredStudent.update({
              where: { id: student.id },
              data: {
                studentProfileId: studentProfile.id
              }
            });
          }
        }
      }

      const updatedFeaturedStudents = await prisma.featuredStudent.findMany({
        where: {
          isActive: true
        },
        include: {
          studentProfile: {
            select: {
              cvPath: true,
              trainings: {
                select: {
                  grade: true
                }
              }
            }
          },
          trainingReviews: {
            include: {
              training: true
            }
          }
        }
      });

      const mappedStudents = updatedFeaturedStudents.map(student => ({
        ...student,
        cvPath: student.studentProfile?.cvPath || null,
        trainingReviews: student.trainingReviews || [],
        grade: student.studentProfile?.trainings?.[0]?.grade || null

      }));

      return {
        statusCode: 200,
        message: mappedStudents
      };
    } catch (error) {
      console.error('Error fetching featured students:', error);
      return {
        statusCode: 500,
        message: []
      };
    }
  }

  async getFeaturedStudentById(studentId: string) {
    try {
      console.log('Fetching student with ID:', studentId); 

      const student = await prisma.featuredStudent.findUnique({
        where: { id: Number(studentId) }
      });
      
      console.log('Found student:', student);
      
      if (!student) {
        return { 
          statusCode: 404, 
          message: 'Featured student not found' 
        };
      }
      
      return { 
        statusCode: 200, 
        message: student 
      };
    } catch (error: any) {
      console.error('Error fetching student:', error);
      return { 
        statusCode: 500, 
        message: error.message 
      };
    }
  }

  async createFeaturedStudent(data: FeaturedStudentData & { image?: Express.Multer.File }) {
    try {
      console.log('Raw data in service:', data);
      console.log('Raw achievements in service:', data.achievements);

      const achievements = Array.isArray(data.achievements) 
        ? data.achievements 
        : typeof data.achievements === 'string'
          ? JSON.parse(data.achievements)
          : [];

      console.log('Final achievements to save:', achievements);

      const { image, ...studentData } = data;

      const existingStudent = await prisma.featuredStudent.findUnique({
        where: { email: studentData.email }
      });

      if (existingStudent) {
        return { 
          statusCode: 400, 
          message: 'A student with this email already exists' 
        };
      }

      const imagePath = image ? await this.uploadImage(image) : null;

      // Find student profile by email
      const studentProfile = await prisma.studentProfile.findFirst({
        where: {
          user: {
            email: studentData.email
          }
        },
        include: {
          user: true
        }
      });

      const newStudent = await prisma.featuredStudent.create({
        data: {
          ...studentData,
          score: parseInt(studentData.score.toString()),
          imagePath,
          graduationDate: new Date(studentData.graduationDate).toISOString(),
          achievements: achievements,
          isActive: typeof studentData.isActive === 'string' 
            ? studentData.isActive === 'true'
            : !!studentData.isActive,
          studentProfileId: studentProfile?.id || null  
        },
        include: {
          studentProfile: {
            select: {
              cvPath: true
            }
          }
        }
      });

      return { 
        statusCode: 201, 
        message: {
          ...newStudent,
          cvPath: newStudent.studentProfile?.cvPath || null
        }
      };
    } catch (error: any) {
      console.error('Error creating featured student:', error);
      console.error('Error details:', error.message);
      return { 
        statusCode: 500, 
        message: 'Error creating featured student. Please try again.' 
      };
    }
  }

  async updateFeaturedStudent(studentId: string, data: Partial<FeaturedStudentData> & { image?: Express.Multer.File }) {
    try {
      let imageUrl;
      if (data.image) {
        imageUrl = await this.uploadImage(data.image);
      }

      const { image, ...updateData } = data;

      const achievements = Array.isArray(data.achievements) 
        ? data.achievements 
        : data.achievements 
          ? JSON.parse(Array.isArray(data.achievements) ? JSON.stringify(data.achievements) : data.achievements)
          : undefined;

      const updatedStudent = await prisma.featuredStudent.update({
        where: { id: Number(studentId) },
        data: {
          ...updateData,
          ...(imageUrl && { imagePath: imageUrl }),
          ...(updateData.graduationDate && {
            graduationDate: new Date(updateData.graduationDate).toISOString()
          }),
          isActive: typeof updateData.isActive === 'string'
            ? updateData.isActive === 'true' 
            : updateData.isActive,
          score: updateData.score ? parseInt(updateData.score.toString()) : undefined,
          achievements: achievements 
        }
      });
      
      return { statusCode: 200, message: updatedStudent };
    } catch (error: any) {
      console.error('Error updating featured student:', error);
      return { 
        statusCode: 500, 
        message: 'Error updating featured student' 
      };
    }
  }

  async deleteFeaturedStudent(studentId: string) {
    try {
      await prisma.featuredStudent.delete({
        where: { id: Number(studentId) }
      });
      
      return { 
        statusCode: 200, 
        message: 'Featured student deleted successfully' 
      };
    } catch (error: any) {
      console.error('Error deleting featured student:', error);
      return { 
        statusCode: 500, 
        message: 'Error deleting featured student' 
      };
    }
  }

  async getFeaturedStudentsByCourse(courseType: CourseType) {
    try {
      const students = await prisma.featuredStudent.findMany({
        where: { 
          courseType,
          isActive: true
        },
        orderBy: {
          score: 'desc'
        }
      });
      
      return { statusCode: 200, message: students };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async getTopPerformingStudents(limit: number = 5) {
    try {
      const students = await prisma.featuredStudent.findMany({
        where: { isActive: true },
        orderBy: {
          score: 'desc'
        },
        take: limit
      });
      
      return { statusCode: 200, message: students };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async getStudentProfileCV(studentId: string) {
    try {
      const featuredStudent = await prisma.featuredStudent.findUnique({
        where: { id: Number(studentId) },
        include: {
          studentProfile: {
            select: {
              cvPath: true,
              user: {
                select: {
                  name: true,
                  surname: true
                }
              }
            }
          }
        }
      });

      if (!featuredStudent) {
        return { 
          statusCode: 404, 
          message: 'Featured student not found' 
        };
      }

      if (!featuredStudent.studentProfile?.cvPath) {
        return { 
          statusCode: 404, 
          message: 'No CV found for this student' 
        };
      }

      return { 
        statusCode: 200, 
        message: {
          cvPath: featuredStudent.studentProfile.cvPath,
          name: featuredStudent.studentProfile.user.name,
          surname: featuredStudent.studentProfile.user.surname
        }
      };
    } catch (error) {
      console.error('Error fetching student CV:', error);
      return { 
        statusCode: 500, 
        message: 'Error fetching student CV' 
      };
    }
  }
} 