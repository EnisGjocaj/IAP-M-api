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

const cache = new NodeCache({ stdTTL: 60 * 5 });
const teamMemberService = new TeamMemberService(); 

const app = express();

app.use(express.json()); // Middleware to parse JSON

app.use(cors());


const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});

// Multer middleware
const upload = multer({ storage });

// Serve static files from the uploads directory
app.use('/uploads', express.static(uploadDir));

// Example image upload route
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`; // URL to access the image
  res.json({ url: fileUrl });
});





async function preloadCache() {
  try {
    const teamMembersData = await teamMemberService.getAllTeamMembers();
    if (teamMembersData.statusCode === 200) {
      cache.set('/team-members', teamMembersData.message);
      console.log("Team members data preloaded into cache.");
    } else {
      console.log("Error during cache preloading: ", teamMembersData.message);
    }
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
  const key = req.originalUrl; // Use request URL as the cache key
  const cachedResponse = cache.get(key);
  
  if (cachedResponse) {
    console.log("Serving cached data for: ", key);
    return res.json(cachedResponse); // Return cached response if available
  } else {
    console.log("No cache found, fetching data from DB for: ", key);
    const originalJson = res.json.bind(res);
    
    res.json = (body: any) => {
      console.log("Caching new response for: ", key);
      cache.set(key, body); // Cache the response
      return originalJson(body); // Return the response to client
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
