import express, { Request, Response } from 'express';
import { UserService } from './users.service';
import { authenticateJWT } from '../middleware/authMiddleware';
const userService = new UserService();
const userRouter = express.Router();

// Register User
userRouter.post('/register', async (req: Request, res: Response) => {
  const { name, surname, email, password } = req.body;
  const result = await userService.registerUser({ name, surname, email, password });
  return res.status(result.statusCode).json(result.message);
});

// Login User
userRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await userService.loginUser({ email, password });
  return res.status(result.statusCode).json(result.message);
});

// Get User By ID (protected route example)
userRouter.get('/:id', authenticateJWT, async (req: Request, res: Response) => {
  const userId = req.params.id;
  const result = await userService.getUserById(userId);
  return res.status(result.statusCode).json(result.message);
});

export default userRouter;
