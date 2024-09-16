import express, { Request, Response, NextFunction } from 'express';
import { ManageUserService } from './manageUsers.service';

const manageUserService = new ManageUserService();
const manageUserRouter = express.Router();

// Get all users
manageUserRouter.get('/', async (req: Request, res: Response) => {
  try {
    const usersList = await manageUserService.getAllUsers();
    return res.status(usersList.statusCode).json(usersList.message);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user by ID
manageUserRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await manageUserService.getUserById(req.params.id);
    if (user.statusCode === 404) {
      return res.status(404).json(user.message);
    }
    return res.status(200).json(user.message);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create user
manageUserRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, surname, email, password } = req.body; // Get form fields from req.body

    // Create the user
    const user = await manageUserService.createUser({
      name,
      surname,
      email,
      password,
    });

    return res.status(user.statusCode).json(user.message);
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ message: 'Error creating user' });
  }
});

// Update user
manageUserRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const updatedUser = await manageUserService.updateUser(req.params.id, req.body);
    return res.status(updatedUser.statusCode).json(updatedUser.message);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete user
manageUserRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await manageUserService.deleteUser(req.params.id);
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});



export default manageUserRouter;
