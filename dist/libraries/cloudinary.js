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
exports.uploadToCloudinary = exports.upload = void 0;
// src/libraries/cloudinary.ts
const dotenv_1 = __importDefault(require("dotenv"));
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const sharp_1 = __importDefault(require("sharp"));
dotenv_1.default.config();
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
});
const storage = multer_1.default.memoryStorage();
exports.upload = (0, multer_1.default)({ storage: storage });
const uploadToCloudinary = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return next(new Error('No files provided'));
        }
        const cloudinaryUrls = [];
        for (const file of files) {
            const resizedBuffer = yield (0, sharp_1.default)(file.buffer)
                .resize({ width: 800, height: 600 })
                .toBuffer();
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                resource_type: 'auto',
                folder: 'your-cloudinary-folder-name',
            }, (err, result) => {
                if (err) {
                    console.error('Cloudinary upload error:', err);
                    return next(err);
                }
                if (!result) {
                    console.error('Cloudinary upload error: Result is undefined');
                    return next(new Error('Cloudinary upload result is undefined'));
                }
                cloudinaryUrls.push(result.secure_url);
                if (cloudinaryUrls.length === files.length) {
                    // All files processed
                    req.body.cloudinaryUrls = cloudinaryUrls;
                    next();
                }
            });
            uploadStream.end(resizedBuffer);
        }
    }
    catch (error) {
        console.error('Error in uploadToCloudinary middleware:', error);
        next(error);
    }
});
exports.uploadToCloudinary = uploadToCloudinary;
//# sourceMappingURL=cloudinary.js.map