import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export class UserService {
  async registerUser(data: { name: string; surname: string; email: string; password: string }) {
    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await prisma.user.create({
        data: {
          name: data.name,
          surname: data.surname,
          email: data.email,
          password: hashedPassword,
        },
      });

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
        expiresIn: '1h',
      });

      return { statusCode: 201, message: { token, user } };
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
      });

      if (!user || !(await bcrypt.compare(data.password, user.password))) {
        return { statusCode: 401, message: 'Invalid credentials' };
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
        expiresIn: '1h',
      });

      return { statusCode: 200, message: { token, user } };
    } catch (error: any) {
      return { statusCode: 500, message: 'Internal server error' };
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
