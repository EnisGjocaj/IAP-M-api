import express from 'express';
import newsRouter from './apps/news/news.route';
import applicationRouter from './apps/application/application.route';
import teamMemberRouter from './apps/teamMember/teamMembers.route';
import userRouter from './apps/users/users.route';

import manageUserRouter from './apps/manageUsers/manageUsers.route';

import dashboardRouter from './apps/dashboard/dashboard.route';

import path from 'path';

import cors from "cors";
import fs from 'fs';

import multer from "multer";
import NodeCache from 'node-cache';

import { TeamMemberService } from './apps/teamMember/teamMember.service';
import { UploadApiResponse } from 'cloudinary';

const cache = new NodeCache({ stdTTL: 60 * 5 });
const teamMemberService = new TeamMemberService(); 

import cloudinary from 'cloudinary';
import { v2 as cloudinaryV2 } from 'cloudinary';
import multerStorageCloudinary from 'multer-storage-cloudinary';

const app = express();

app.use(express.json()); // Middleware to parse JSON

app.use(cors());

cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

const upload = multer({ storage });

const uploadToCloudinary = (file: Express.Multer.File): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    cloudinaryV2.uploader.upload_stream(
      {
        folder: 'uploads',
        allowed_formats: ['jpg', 'png', 'jpeg'],
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(error);
        }
        console.log('Cloudinary upload result:', result);
        resolve(result as UploadApiResponse); // Explicitly type result as UploadApiResponse
      }
    ).end(file.buffer);
  });
};





// const uploadDir = path.join(__dirname, '../uploads');
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
//   },
// });

// const upload = multer({ storage });

// app.use('/uploads', express.static(uploadDir));

// app.post('/api/upload', upload.single('file'), (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ error: 'No file uploaded' });
//   }
//   const fileUrl = `/uploads/${req.file.filename}`; 
//   res.json({ url: fileUrl });
// });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const result = await uploadToCloudinary(req.file);
    res.json({ url: result.secure_url }); // URL to access the image
  } catch (error) {
    res.status(500).json({ error: 'Error uploading file' });
  }
});






async function preloadCache() {
  try {
    const teamMembersData = await teamMemberService.getAllTeamMembers(); // Fetch team members
    cache.set('/team-members', teamMembersData.message); // Cache the data
    console.log("Team members data preloaded into cache.");
  } catch (error) {
    console.error("Error preloading team members:", error);
  }
}

// Call preload function on server startup
preloadCache();

// Refresh the cache every 5 minutes
setInterval(preloadCache, 5 * 60 * 1000);


// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//       const uploadDir = path.join(__dirname, '../uploads');
//       if (!fs.existsSync(uploadDir)) {
//         fs.mkdirSync(uploadDir);
//       }
//       cb(null, uploadDir);
//     },
//     filename: (req, file, cb) => {
//       cb(null, Date.now() + path.extname(file.originalname));
//     },
//   });
  
//   const upload = multer({ storage });
  
//   app.post('/api/upload',  upload.single('file'), (req, res) => {
//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }
//     const fileUrl = `/uploads/${req.file.filename}`;
//     res.json({ url: fileUrl });
//   });
  
//   // app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
//   app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


  function cacheMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    const key = req.originalUrl; // use the request URL as the cache key
    const cachedResponse = cache.get(key);
  
    if (cachedResponse) {
      return res.json(cachedResponse); // Return the cached response if available
    } else {
      const originalJson = res.json.bind(res); // Store the original res.json method
  
      res.json = (body: any) => {
        cache.set(key, body); // Cache the response
        return originalJson(body); // Ensure the overridden method returns the original response
      };
  
      next(); // Continue to the next middleware if no cached response
    }
  }
  
// Register the routes
app.use('/news', cacheMiddleware, newsRouter);
app.use('/applications', cacheMiddleware, applicationRouter);
app.use("/team-members", cacheMiddleware, teamMemberRouter);
app.use("/users", cacheMiddleware, userRouter);
app.use("/manageUsers", cacheMiddleware,  manageUserRouter);
app.use("/dashboard", cacheMiddleware, dashboardRouter);

export default app;
