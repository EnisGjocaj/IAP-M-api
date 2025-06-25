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
      const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
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
  
}
