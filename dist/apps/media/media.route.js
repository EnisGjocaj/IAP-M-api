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
exports.mediaRouter = void 0;
const express_1 = __importDefault(require("express"));
const media_service_1 = require("./media.service");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const mediaService = new media_service_1.MediaService();
exports.mediaRouter = express_1.default.Router();
const storage = multer_1.default.diskStorage({
    destination: "src/utils/uploads/",
    filename: function (req, file, cb) {
        // Define the desired filename here
        //Also edit it here
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const extension = path_1.default.extname(file.originalname);
        cb(null, file.fieldname + "-" + uniqueSuffix + extension);
    },
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (request, file, cb) => __awaiter(void 0, void 0, void 0, function* () {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error("only file type of image is allowed"));
        }
        cb(null, true);
    }),
});
exports.mediaRouter.post("/upload", upload.single("image"), (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    if (!request.file) {
        return response.status(400).send("file upload failed");
    }
    const result = yield mediaService.uploadFile(request.file);
    return response.status(result.statusCode).json(result.message);
}));
//# sourceMappingURL=media.route.js.map