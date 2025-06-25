import express from 'express';
import newsRouter from './apps/news/news.route';
import applicationRouter from './apps/application/application.route';
import teamMemberRouter from './apps/teamMember/teamMembers.route';
import userRouter from './apps/users/users.route';

import manageUserRouter from './apps/manageUsers/manageUsers.route';

import dashboardRouter from './apps/dashboard/dashboard.route';
import jobListingRouter from './apps/jobListing/jobListing.route';

import path from 'path';

import cors from "cors";
import fs from 'fs';

import multer from "multer";
import NodeCache from 'node-cache';

import { TeamMemberService } from './apps/teamMember/teamMember.service';
import { NewsService } from './apps/news/news.service';

const cache = new NodeCache({ stdTTL: 60 * 5 });

const teamMemberService = new TeamMemberService(); 
const newsService = new NewsService();

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
    cb(null, Date.now() + path.extname(file.originalname)); 
  },
});

// Multer middleware
const upload = multer({ storage });

// app.use('/uploads', express.static(uploadDir));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));


app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`; 
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

    const newsData = await newsService.getAllNews();
    if (newsData) {
      cache.set('/news', newsData); 
      console.log("News data preloaded into cache.");
    } else {
      console.log("Error during cache preloading for news.");
    }
  } catch (error) {
    console.error("Error preloading team members:", error);
  }
}

preloadCache();

setInterval(preloadCache, 5 * 60 * 1000);

function invalidateRelatedCache(path: string) {
  const keys = cache.keys();
  const relatedKeys = keys.filter(key => key.includes(path));
  console.log('Invalidating cache keys:', relatedKeys);
  relatedKeys.forEach(key => cache.del(key));
}

function cacheMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method !== 'GET') {
    const basePath = req.path.split('/')[1]; 
    invalidateRelatedCache(basePath);
    return next();
  }

  const key = req.originalUrl;
  const cachedResponse = cache.get(key);
  
  if (cachedResponse) {
    console.log("Serving cached data for: ", key);
    return res.json(cachedResponse);
  } else {
    console.log("No cache found, fetching data from DB for: ", key);
    const originalJson = res.json.bind(res);
    
    res.json = (body: any) => {
      console.log("Caching new response for: ", key);
      cache.set(key, body);
      return originalJson(body);
    };
    next();
  }
}

app.use('/news', cacheMiddleware, newsRouter);
app.use('/applications', cacheMiddleware, applicationRouter);
app.use('/job-listings', jobListingRouter); 
app.use("/team-members", cacheMiddleware, teamMemberRouter);
app.use("/users", cacheMiddleware, userRouter);
app.use("/manageUsers", cacheMiddleware,  manageUserRouter);
app.use("/dashboard", cacheMiddleware, dashboardRouter);

export default app;
