import express, { Request, Response } from 'express';
import { NewsService } from './news.service';
import multer from 'multer';

const newsService = new NewsService();
const newsRouter = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Get all news - No caching
newsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const newsList = await newsService.getAllNews();
    return res.status(200).json(newsList);
  } catch (error) {
    console.error('Error fetching news:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get news by ID
newsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const newsItem = await newsService.getNewsById(req.params.id);
    if (!newsItem) {
      return res.status(404).json({ message: 'News not found' });
    }
    return res.status(200).json(newsItem);
  } catch (error) {
    console.error('Error fetching news:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create news with image
newsRouter.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, content } = req.body;
    const newsItem = await newsService.createNews({
      title,
      content,
      image: req.file
    });
    return res.status(201).json(newsItem);
  } catch (error: any) {
    console.error('Error creating news:', error);
    return res.status(500).json({ message: error.message });
  }
});

// Update news
newsRouter.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { title, content } = req.body;
    const updatedNews = await newsService.updateNews(req.params.id, {
      title,
      content,
      image: req.file
    });
    return res.status(200).json(updatedNews);
  } catch (error: any) {
    console.error('Error updating news:', error);
    return res.status(500).json({ message: error.message });
  }
});

// Delete news
newsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await newsService.deleteNews(req.params.id);
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting news:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default newsRouter;
