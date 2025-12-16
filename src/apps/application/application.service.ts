import { PrismaClient, TrainingType } from '@prisma/client';

import { sendApplicationEmail } from './mailer';

interface ApplicationData {
  name: string;
  surname: string;
  email: string;
  phoneNumber?: string;
  type: 'INFORMATION_SCIENCE' | 'AGROBUSINESS' | 'ACCOUNTING' | 'MARKETING';
}


const prisma = new PrismaClient();

export class ApplicationService {
  async getAllApplications() {
    try {
      const applications = await prisma.application.findMany();
      return { statusCode: 200, message: applications };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async getApplicationById(applicationId: string) {
    try {
      const application = await prisma.application.findUnique({
        where: { id: Number(applicationId) },
      });
      if (!application) {
        return { statusCode: 404, message: 'Application not found' };
      }
      return { statusCode: 200, message: application };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  // async createApplication(data: { name: string; surname: string; email: string; type: 'INFORMATION_SCIENCE' | 'AGROBUSINESS' | 'ACCOUNTING' | 'MARKETING' }) {
  //   try {
  //     // Create the new application
  //     const newApplication = await prisma.application.create({ data });

  //     // Send the application email
  //     await sendApplicationEmail(data.email, data.name, data.type);

  //     return { statusCode: 201, message: newApplication };
  //   } catch (error: any) {
  //     throw new Error(`Error creating application: ${error.message}`);
  //   }
  // }



  async createApplication(data: ApplicationData) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Use upsert to atomically get or create user, avoiding race conditions
        const randomPassword = Math.random().toString(36).slice(-8);
        const user = await tx.user.upsert({
          where: { email: data.email },
          update: {
            // Update name and surname if user exists but info might be outdated
            name: data.name,
            surname: data.surname,
          },
          create: {
            email: data.email,
            name: data.name,
            surname: data.surname,
            password: randomPassword,
          },
        });

        const newApplication = await tx.application.create({
          data: {
            name: data.name,
            surname: data.surname,
            email: data.email,
            phoneNumber: data.phoneNumber,
            type: data.type as TrainingType,
            userId: user.id,
          },
        });

        return { user, application: newApplication };
      });

      // Send email outside transaction to avoid blocking on email failures
      sendApplicationEmail(data.email, data.name, data.type).catch((error) => {
        console.error('Error sending email (non-blocking):', error);
      });

      return { 
        statusCode: 201, 
        message: result.application 
      };

    } catch (error: any) {
      console.error('Error creating application:', error);
      
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('email_type')) {
          return { 
            statusCode: 400, 
            message: 'You have already applied for this training type' 
          };
        }
        if (error.meta?.target?.includes('email')) {
          return { 
            statusCode: 400, 
            message: 'A user with this email already exists' 
          };
        }
      }

      return { 
        statusCode: 500, 
        message: 'Error creating application. Please try again.' 
      };
    }
  }

  async updateApplication(applicationId: string, data: { name?: string; surname?: string; email?: string; type?: 'INFORMATION_SCIENCE' | 'AGROBUSINESS' | 'ACCOUNTING' | 'MARKETING' }) {
    try {
      const updatedApplication = await prisma.application.update({
        where: { id: Number(applicationId) },
        data,
      });
      return { statusCode: 200, message: updatedApplication };
    } catch (error: any) {
      throw new Error(`Error updating application: ${error.message}`);
    }
  }

  async deleteApplication(applicationId: string) {
    try {
      const deletedApplication = await prisma.application.delete({
        where: { id: Number(applicationId) },
      });
      return { statusCode: 200, message: deletedApplication };
    } catch (error: any) {
      throw new Error(`Error deleting application: ${error.message}`);
    }
  }
}
