"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const news_service_1 = require("./news.service");
const newsService = new news_service_1.NewsService();
const newsRouter = express_1.default.Router();
// import upload from '../../multerConfig';
const cloudinary_1 = require("cloudinary");
const cloudinary_2 = require("../../libraries/cloudinary");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
newsRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newsList = yield newsService.getAllNews();
        return res.status(200).json(newsList);
    }
    catch (error) {
        console.error('Error fetching news:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Get news by ID
newsRouter.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newsItem = yield newsService.getNewsById(req.params.id);
        if (!newsItem) {
            return res.status(404).json({ message: 'News not found' });
        }
        return res.status(200).json(newsItem);
    }
    catch (error) {
        console.error('Error fetching news:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
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
// newsRouter.post('/', upload.single('image'), async (req, res) => {
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
newsRouter.post('/', cloudinary_2.upload.single('image'), cloudinary_2.uploadToCloudinary, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, content } = req.body; // Get form fields from req.body
        // Get the Cloudinary URL from the middleware
        const cloudinaryUrls = req.body.cloudinaryUrls;
        // If there's no Cloudinary URL, handle the error
        if (!cloudinaryUrls || cloudinaryUrls.length === 0) {
            console.error('No Cloudinary URL found.');
            return res.status(500).send('Error uploading image');
        }
        // Use the first URL as the image URL for this news item
        const imageUrl = cloudinaryUrls[0];
        // Log to verify form data and image URL
        console.log('Form Data:', { title, content, imageUrl });
        // Create the news item with the Cloudinary image URL
        const newsItem = yield newsService.createNews({
            title,
            content,
            imageUrl, // Pass the Cloudinary URL to the service
        });
        return res.status(201).json(newsItem);
    }
    catch (error) {
        console.error('Error creating news:', error);
        return res.status(500).json({ message: 'Error creating news' });
    }
}));
// Update news
newsRouter.put('/:id', cloudinary_2.upload.single('image'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, content } = req.body; // Get form fields
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined; // Set imageUrl only if an image is uploaded
        // Create an object with fields to update
        const updateData = { title, content };
        if (imageUrl) {
            updateData.imageUrl = imageUrl;
        }
        const updatedNews = yield newsService.updateNews(req.params.id, updateData);
        return res.status(200).json(updatedNews);
    }
    catch (error) {
        console.error('Error updating news:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Delete news
newsRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield newsService.deleteNews(req.params.id);
        return res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting news:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
exports.default = newsRouter;
//# sourceMappingURL=news.route.js.map