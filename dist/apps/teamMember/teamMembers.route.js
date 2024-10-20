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
// teamMember.router.ts
const express_1 = __importDefault(require("express"));
const teamMember_service_1 = require("./teamMember.service");
const media_service_1 = require("../media/media.service");
const multerConfig_1 = __importDefault(require("../../multerConfig"));
const node_cache_1 = __importDefault(require("node-cache"));
const cache = new node_cache_1.default({ stdTTL: 60 * 5 });
const teamMemberService = new teamMember_service_1.TeamMemberService();
const teamMemberRouter = express_1.default.Router();
const mediaService = new media_service_1.MediaService();
// Get all team members
// teamMemberRouter.get('/', async (req: Request, res: Response) => {
//   try {
//     const teamMembers = await teamMemberService.getAllTeamMembers();
//     return res.status(teamMembers.statusCode).json(teamMembers.message);
//   } catch (error) {
//     console.error('Error fetching team members:', error);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// });
teamMemberRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cacheKey = '/team-members';
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            // Return cached data immediately
            res.json(cachedData);
            // Fetch fresh data asynchronously and update cache
            const freshData = yield teamMemberService.getAllTeamMembers();
            cache.set(cacheKey, freshData.message);
            console.log("Cache updated with fresh data.");
        }
        else {
            // No cache available, fetch data and cache it
            const teamMembers = yield teamMemberService.getAllTeamMembers();
            cache.set(cacheKey, teamMembers.message);
            res.json(teamMembers.message);
        }
    }
    catch (error) {
        console.error('Error fetching team members:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Get team member by ID
teamMemberRouter.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const teamMember = yield teamMemberService.getTeamMemberById(req.params.id);
        if (teamMember.statusCode === 404) {
            return res.status(404).json({ message: 'Team member not found' });
        }
        return res.status(teamMember.statusCode).json(teamMember.message);
    }
    catch (error) {
        console.error('Error fetching team member:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
teamMemberRouter.post('/', multerConfig_1.default.single('image'), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fullName, role, description, title } = req.body; // Form fields
        const imagePath = req.file ? `/uploads/${req.file.filename}` : ''; // Image file path
        // Log to verify form data and image
        console.log('Form Data:', { fullName, role, description, title, imagePath });
        // You can use the media service here to handle file operations (optional)
        if (req.file) {
            yield mediaService.uploadFile(req.file);
        }
        // Now create the team member with the file path
        const teamMember = yield teamMemberService.createTeamMember({
            fullName,
            role,
            description,
            title,
            imagePath, // Associate the image path with the team member
        });
        return res.status(teamMember.statusCode).json(teamMember.message);
    }
    catch (error) {
        console.error('Error creating team member:', error);
        return res.status(500).json({ message: 'Error creating team member' });
    }
}));
// teamMemberRouter.put('/:id', async (req: Request, res: Response) => {
//   try {
//     const updatedTeamMember = await teamMemberService.updateTeamMember(req.params.id, req.body);
//     return res.status(updatedTeamMember.statusCode).json(updatedTeamMember.message);
//   } catch (error) {
//     console.error('Error updating team member:', error);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// });
// Update team member
teamMemberRouter.put('/:id', multerConfig_1.default.single('image'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fullName, role, description, title } = req.body;
        const imagePath = req.file ? `/uploads/${req.file.filename}` : undefined; // Set imagePath only if an image is uploaded
        // Create an object with fields to update
        const updateData = { fullName, role, description, title };
        if (imagePath) {
            updateData.imagePath = imagePath;
        }
        const updatedTeamMember = yield teamMemberService.updateTeamMember(req.params.id, updateData);
        return res.status(updatedTeamMember.statusCode).json(updatedTeamMember.message);
    }
    catch (error) {
        console.error('Error updating team member:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Delete team member
teamMemberRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield teamMemberService.deleteTeamMember(req.params.id);
        return res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting team member:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
exports.default = teamMemberRouter;
//# sourceMappingURL=teamMembers.route.js.map