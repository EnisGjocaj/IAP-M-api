"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Setup Multer storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../uploads'); // Central upload directory
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir);
        }
        cb(null, uploadDir); // Destination folder for uploads
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const extension = path_1.default.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`); // Filename
    },
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|jfif)$/)) {
            return cb(new Error('Only image files are allowed!'));
        }
        cb(null, true);
    },
});
exports.default = upload;
//# sourceMappingURL=multerConfig.js.map