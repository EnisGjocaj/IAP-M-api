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
const news_route_1 = __importDefault(require("./apps/news/news.route"));
const application_route_1 = __importDefault(require("./apps/application/application.route"));
const teamMembers_route_1 = __importDefault(require("./apps/teamMember/teamMembers.route"));
const users_route_1 = __importDefault(require("./apps/users/users.route"));
const manageUsers_route_1 = __importDefault(require("./apps/manageUsers/manageUsers.route"));
const dashboard_route_1 = __importDefault(require("./apps/dashboard/dashboard.route"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const node_cache_1 = __importDefault(require("node-cache"));
const teamMember_service_1 = require("./apps/teamMember/teamMember.service");
const cloudinary_1 = __importDefault(require("cloudinary"));
// Configure Cloudinary
cloudinary_1.default.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const cache = new node_cache_1.default({ stdTTL: 60 * 5 });
const teamMemberService = new teamMember_service_1.TeamMemberService();
const app = (0, express_1.default)();
app.use(express_1.default.json()); // Middleware to parse JSON
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)({
    origin: 'https://iap-m.com', // Allow requests from this domain
}));
const uploadDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Multer storage configuration
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path_1.default.extname(file.originalname)); // Unique filename
    },
});
// Multer middleware
const upload = (0, multer_1.default)({ storage });
// Serve static files from the uploads directory
app.use('/uploads', express_1.default.static(uploadDir));
// Example image upload route
// Example image upload route with Cloudinary
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Upload the file to Cloudinary
    cloudinary_1.default.v2.uploader.upload(req.file.path, (error, result) => {
        if (error || !result) {
            return res.status(500).json({ error: 'Failed to upload to Cloudinary' });
        }
        // Return the URL of the uploaded image
        res.json({ url: result.secure_url });
    });
});
function preloadCache() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const teamMembersData = yield teamMemberService.getAllTeamMembers(); // Fetch team members
            cache.set('/team-members', teamMembersData.message); // Cache the data
            console.log("Team members data preloaded into cache.");
        }
        catch (error) {
            console.error("Error preloading team members:", error);
        }
    });
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
function cacheMiddleware(req, res, next) {
    const key = req.originalUrl; // use the request URL as the cache key
    const cachedResponse = cache.get(key);
    if (cachedResponse) {
        return res.json(cachedResponse); // Return the cached response if available
    }
    else {
        const originalJson = res.json.bind(res); // Store the original res.json method
        res.json = (body) => {
            cache.set(key, body); // Cache the response
            return originalJson(body); // Ensure the overridden method returns the original response
        };
        next(); // Continue to the next middleware if no cached response
    }
}
// Register the routes
app.use('/news', cacheMiddleware, news_route_1.default);
app.use('/applications', cacheMiddleware, application_route_1.default);
app.use("/team-members", cacheMiddleware, teamMembers_route_1.default);
app.use("/users", cacheMiddleware, users_route_1.default);
app.use("/manageUsers", cacheMiddleware, manageUsers_route_1.default);
app.use("/dashboard", cacheMiddleware, dashboard_route_1.default);
exports.default = app;
//# sourceMappingURL=app.js.map