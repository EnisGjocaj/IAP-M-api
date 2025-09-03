import express, { Request, Response } from 'express';
import { NewsService } from './news.service';
import multer from 'multer';

const newsService = new NewsService();
const newsRouter = express.Router();

// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 5 * 1024 * 1024 
//   },
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype.startsWith('image/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only images are allowed'));
//     }
//   }
// });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'pdfFile') {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed for reports'));
      }
    } else if (file.fieldname === 'images') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only images are allowed'));
      }
    } else {
      cb(null, true);
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
    console.log('API News Route Hit:', {
      endpoint: `/api/news/${req.params.id}`,
      query: req.query,
      userAgent: req.headers['user-agent']?.substring(0, 100)
    });

    const newsItem = await newsService.getNewsById(req.params.id);

    if (newsItem.statusCode === 200) {
      const mainImage = newsItem.message.images?.find((img: any) => img.isMain);
      
      console.log('API News Image Data:', {
        newsId: req.params.id,
        hasImages: newsItem.message.images?.length > 0,
        mainImage: {
          exists: !!mainImage,
          hasMobileUrl: !!mainImage?.mobileSocialUrl,
          hasDesktopUrl: !!mainImage?.desktopSocialUrl,
          hasSocialUrl: !!mainImage?.socialUrl
        }
      });
    }

    if (!newsItem) {
      return res.status(404).json({ message: 'News not found' });
    }
    return res.status(200).json(newsItem);
  } catch (error) {
    console.error('Error in API news route:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create news with image

// newsRouter.post('/', upload.array('images', 10), async (req, res) => {
//   try {
//     const { title, content } = req.body;
//     const newsItem = await newsService.createNews({
//       title,
//       content,
//       images: req.files as Express.Multer.File[]
//     });
//     return res.status(201).json(newsItem);
//   } catch (error: any) {
//     console.error('Error creating news:', error);
//     return res.status(500).json({ message: error.message });
//   }
// });


newsRouter.post('/', upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'pdfFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, content, type, reportDate, reportCategory } = req.body;
    const files = req.files as { images?: Express.Multer.File[], pdfFile?: Express.Multer.File[] };
    
    const newsItem = await newsService.createNews({
      title,
      content,
      type,
      reportDate,
      reportCategory,
      images: files.images,
      pdfFile: files.pdfFile?.[0]
    });
    return res.status(201).json(newsItem);
  } catch (error: any) {
    console.error('Error creating news:', error);
    return res.status(500).json({ message: error.message });
  }
});
// Update news
newsRouter.put('/:id', upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'pdfFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, content, type, reportDate, reportCategory, existingImages } = req.body;
    const files = req.files as { images?: Express.Multer.File[], pdfFile?: Express.Multer.File[] };
    
    console.log('Update news request:', {
      id: req.params.id,
      body: { title, content, type, reportDate, reportCategory },
      files: files ? Object.keys(files) : 'no files'
    });
    
    const updatedNews = await newsService.updateNews(req.params.id, {
      title,
      content,
      type,
      reportDate,
      reportCategory,
      images: files.images,
      pdfFile: files.pdfFile?.[0],
      existingImages: existingImages ? JSON.parse(existingImages) : []
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
