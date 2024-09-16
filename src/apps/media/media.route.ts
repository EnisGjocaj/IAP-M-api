import express from "express";
import type { Request, Response } from "express";
import { MediaService } from "./media.service";
import multer from "multer";
import path from "path";
const mediaService = new MediaService();
export const mediaRouter = express.Router();

const storage = multer.diskStorage({
  destination: "src/utils/uploads/",
  filename: function (req, file, cb) {
    // Define the desired filename here
    //Also edit it here
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + extension);
  },
});

const upload = multer({
  storage,
  fileFilter: async (request, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error("only file type of image is allowed"));
    }
    cb(null, true);
  },
});

mediaRouter.post(
  "/upload",
  upload.single("image"),
  async (request: Request, response: Response) => {
    if (!request.file) {
      return response.status(400).send("file upload failed");
    }
    const result = await mediaService.uploadFile(request.file);
    return response.status(result.statusCode).json(result.message);
  }
);
