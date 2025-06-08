import { PrismaClient, TrainingType } from '@prisma/client';

import { sendApplicationEmail } from './mailer';


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


  async createApplication(data: { 
    name: string; 
    surname: string; 
    email: string; 
    type: 'INFORMATION_SCIENCE' | 'AGROBUSINESS' | 'ACCOUNTING' | 'MARKETING' 
  }) {
    try {
      // Use a single transaction for both user creation and application
      const result = await prisma.$transaction(async (tx) => {
        // Check if user exists first
        let user = await tx.user.findUnique({
          where: { email: data.email },
        });

        if (!user) {
          // Create new user with a random password
          const randomPassword = Math.random().toString(36).slice(-8);
          user = await tx.user.create({
            data: {
              email: data.email,
              name: data.name,
              surname: data.surname,
              password: randomPassword,
            },
          });
        }

        // Create new application
        const newApplication = await tx.application.create({
          data: {
            name: data.name,
            surname: data.surname,
            email: data.email,
            type: data.type as TrainingType,
            userId: user.id,
          },
        });

        return { user, application: newApplication };
      });

      // Send email after successful transaction
      await sendApplicationEmail(data.email, data.name, data.type);

      return { 
        statusCode: 201, 
        message: result.application 
      };

    } catch (error: any) {
      console.error('Error creating application:', error);
      
      // Handle duplicate application
      if (error.code === 'P2002' && error.meta?.target?.includes('email_type')) {
        return { 
          statusCode: 400, 
          message: 'You have already applied for this training type' 
        };
      }

      // Handle any other errors
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
