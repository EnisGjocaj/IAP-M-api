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


const app = express();

app.use(express.json()); // Middleware to parse JSON

app.use(cors()); //

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
    },
  });
  
  const upload = multer({ storage });
  
  app.post('/api/upload',  upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });
  
  // app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


// Register the routes
app.use('/news', newsRouter);
app.use('/applications', applicationRouter);
app.use("/team-members", teamMemberRouter);
app.use("/users", userRouter);
app.use("/manageUsers", manageUserRouter);
app.use("/dashboard", dashboardRouter);

export default app;
