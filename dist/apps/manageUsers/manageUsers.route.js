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
const manageUsers_service_1 = require("./manageUsers.service");
const manageUserService = new manageUsers_service_1.ManageUserService();
const manageUserRouter = express_1.default.Router();
// Get all users
manageUserRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const usersList = yield manageUserService.getAllUsers();
        return res.status(usersList.statusCode).json(usersList.message);
    }
    catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Get user by ID
manageUserRouter.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield manageUserService.getUserById(req.params.id);
        if (user.statusCode === 404) {
            return res.status(404).json(user.message);
        }
        return res.status(200).json(user.message);
    }
    catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Create user
manageUserRouter.post('/', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, surname, email, password } = req.body; // Get form fields from req.body
        // Create the user
        const user = yield manageUserService.createUser({
            name,
            surname,
            email,
            password,
        });
        return res.status(user.statusCode).json(user.message);
    }
    catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ message: 'Error creating user' });
    }
}));
// Update user
manageUserRouter.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updatedUser = yield manageUserService.updateUser(req.params.id, req.body);
        return res.status(updatedUser.statusCode).json(updatedUser.message);
    }
    catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Delete user
manageUserRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield manageUserService.deleteUser(req.params.id);
        return res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
exports.default = manageUserRouter;
//# sourceMappingURL=manageUsers.route.js.map