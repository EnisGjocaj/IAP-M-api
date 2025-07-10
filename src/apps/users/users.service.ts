import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export class UserService {
  async registerUser(data: { name: string; surname: string; email: string; password: string }) {
    try {
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await prisma.user.create({
        data: {
          name: data.name,
          surname: data.surname,
          email: data.email,
          password: hashedPassword,
          role: UserRole.CLIENT, 
        },
      });

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      return { statusCode: 201, message: { token, user: { ...user, password: undefined } } };
    } catch (error: any) {
      if (error.code === 'P2002') {
        return { statusCode: 400, message: 'Email already exists' };
      }
      return { statusCode: 500, message: 'Internal server error' };
    }
  }

  async loginUser(data: { email: string; password: string }) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: data.email },
        select: {
          id: true,
          email: true,
          name: true,
          surname: true,
          role: true,
          password: true,
        },
      });

      if (!user) {
        return { statusCode: 401, message: 'Invalid credentials' };
      }

      const isValidPassword = await bcrypt.compare(data.password, user.password);
      if (!isValidPassword) {
        return { statusCode: 401, message: 'Invalid credentials' };
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      // Remove password from user object
      const { password, ...userWithoutPassword } = user;

      return { 
        statusCode: 200, 
        message: { 
          token, 
          user: userWithoutPassword
        } 
      };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        statusCode: 500, 
        message: 'Internal server error. Please try again later.' 
      };
    }
  }

  async getUserById(userId: string) {
    try {
      const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
      if (!user) return { statusCode: 404, message: 'User not found' };
      return { statusCode: 200, message: user };
    } catch (error: any) {
      return { statusCode: 500, message: 'Internal server error' };
    }
  }
}
