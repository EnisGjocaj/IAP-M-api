import express, { Request, Response, NextFunction } from 'express';
import { NewsService } from './news.service';

const newsService = new NewsService();
const newsRouter = express.Router();

import upload from '../../multerConfig';

// Get all news
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

// Create news
// newsRouter.post('/', upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { title, content } = req.body; // Get form fields from req.body
//     const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''; // Image file path

//     // Log to verify form data and image
//     console.log('Form Data:', { title, content, imageUrl });

//     // Create the news item
//     const newsItem = await newsService.createNews({
//       title,
//       content,
//       imageUrl, // Pass the image URL to the service
//     });

//     return res.status(201).json(newsItem);
//   } catch (error) {
//     console.error('Error creating news:', error);
//     return res.status(500).json({ message: 'Error creating news' });
//   }
// });

newsRouter.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, content } = req.body; // Get form fields from req.body
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''; // Image file path

    // Log to verify form data and image
    console.log('Form Data:', { title, content, imageUrl });

    // Create the news item
    const newsItem = await newsService.createNews({
      title,
      content,
      imageUrl, // Pass the image URL to the service
    });

    return res.status(201).json(newsItem);
  } catch (error) {
    console.error('Error creating news:', error);
    return res.status(500).json({ message: 'Error creating news' });
  }
});


// Update news
newsRouter.put('/:id', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { title, content } = req.body; // Get form fields
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined; // Set imageUrl only if an image is uploaded

    // Create an object with fields to update
    const updateData: any = { title, content };
    if (imageUrl) {
      updateData.imageUrl = imageUrl;
    }

    const updatedNews = await newsService.updateNews(req.params.id, updateData);
    return res.status(200).json(updatedNews);
  } catch (error) {
    console.error('Error updating news:', error);
    return res.status(500).json({ message: 'Internal server error' });
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
