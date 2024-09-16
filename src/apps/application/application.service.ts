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


  async createApplication(data: { name: string; surname: string; email: string; type: 'INFORMATION_SCIENCE' | 'AGROBUSINESS' | 'ACCOUNTING' | 'MARKETING' }) {
    try {
      // Find or create the user
      let user = await prisma.user.findUnique({
        where: { email: data.email },
      });
  
      if (!user) {
        // Create the user if they do not exist
        user = await prisma.user.create({
          data: {
            email: data.email,
            name: data.name,
            surname: data.surname,
            // You might need to provide a default password if creating a user is mandatory
            password: 'defaultPassword123', // Handle default password or adjust logic accordingly
          },
        });
      }
  
      const applicationType: TrainingType = data.type as TrainingType;

      // Create a new application for the user
      const newApplication = await prisma.application.create({
        data: {
          name: data.name,
          surname: data.surname,
          email: data.email,
          type: applicationType, // Use the TrainingType enum
          userId: user.id,
        },
      });
  
      // Send the application email
      await sendApplicationEmail(data.email, data.name, data.type);
  
      return { statusCode: 201, message: newApplication };
    } catch (error: any) {
      console.error('Error creating application:', error);
      throw new Error(`Error creating application: ${error.message}`);
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
