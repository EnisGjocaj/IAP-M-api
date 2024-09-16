"use strict";
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
const app = (0, express_1.default)();
app.use(express_1.default.json()); // Middleware to parse JSON
app.use((0, cors_1.default)()); //
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({ storage });
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Register the routes
app.use('/news', news_route_1.default);
app.use('/applications', application_route_1.default);
app.use("/team-members", teamMembers_route_1.default);
app.use("/users", users_route_1.default);
app.use("/manageUsers", manageUsers_route_1.default);
app.use("/dashboard", dashboard_route_1.default);
exports.default = app;
//# sourceMappingURL=app.js.map