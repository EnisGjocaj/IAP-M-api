// src/services/dashboard.service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DashboardService {
  async getStatistics() {
    try {
      // Get counts for users, applications, and team members
      const userCount = await prisma.user.count();
      const applicationCount = await prisma.application.count();
      const teamMemberCount = await prisma.teamMember.count();

      return { statusCode: 200, message: { users: userCount, applications: applicationCount, teamMembers: teamMemberCount } };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async getTrainingApplications() {
    try {
      // Get counts of applications by training type
      const trainingCounts = await prisma.application.groupBy({
        by: ['type'],
        _count: {
          type: true,
        },
      });

      const formattedCounts = trainingCounts.map((item) => ({
        trainingType: item.type,
        count: item._count.type,
      }));

      return { statusCode: 200, message: formattedCounts };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }
}
