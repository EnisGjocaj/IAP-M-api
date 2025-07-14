import { PrismaClient } from '@prisma/client';

import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export class ManageUserService {

  
  async getAllUsers() {
    try {
      const usersList = await prisma.user.findMany();
      return { statusCode: 200, message: usersList };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async getUserById(userId: string) {
    try {
      if (!userId) {
        return { statusCode: 400, message: 'User ID is required' };
      }

      const user = await prisma.user.findUnique({
        where: { 
          id: parseInt(userId, 10) 
        }
      });

      if (!user) {
        return { statusCode: 404, message: 'User not found' };
      }

      return { statusCode: 200, message: user };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async createUser(data: { name: string; surname: string; email: string; password: string }) {
    try {
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const newUser = await prisma.user.create({
        data: {
          ...data,
          password: hashedPassword, 
        },
      });

      return { statusCode: 201, message: newUser };
    } catch (error: any) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }
  

  async deleteUser(userId: string) {
    try {
      await prisma.user.delete({
        where: { id: Number(userId) },
      });
      return { statusCode: 204, message: 'User deleted' };
    } catch (error: any) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  async updateUser(userId: string, data: { name?: string; surname?: string; email?: string; password?: string }) {
    try {
      const updatedUser = await prisma.user.update({
        where: { id: Number(userId) },
        data,
      });
      return { statusCode: 200, message: updatedUser };
    } catch (error: any) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }
  
  
  async getAllStudents() {
    try {
      console.log('Fetching students...');
      
      const students = await prisma.user.findMany({
        where: {
          isStudent: true
        },
        include: {
          studentProfile: {
            select: {
              id: true,  
              university: true,
              faculty: true,
              year: true,
              gpa: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      console.log('Found students:', students); 
      return {
        statusCode: 200,
        data: students.map(student => ({
          id: student.id,
          name: student.name,
          surname: student.surname || '',
          email: student.email,
          createdAt: student.createdAt,
          studentProfile: student.studentProfile || {
            university: 'Not specified',
            faculty: 'Not specified',
            year: 'Not specified',
            gpa: 0
          }
        }))
      };
    } catch (error) {
      console.error('Error in getAllStudents:', error);
      return {
        statusCode: 500,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
