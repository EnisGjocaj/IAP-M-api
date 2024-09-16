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
const users_service_1 = require("./users.service");
const authMiddleware_1 = require("../middleware/authMiddleware");
const userService = new users_service_1.UserService();
const userRouter = express_1.default.Router();
// Register User
userRouter.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, surname, email, password } = req.body;
    const result = yield userService.registerUser({ name, surname, email, password });
    return res.status(result.statusCode).json(result.message);
}));
// Login User
userRouter.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const result = yield userService.loginUser({ email, password });
    return res.status(result.statusCode).json(result.message);
}));
// Get User By ID (protected route example)
userRouter.get('/:id', authMiddleware_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.id;
    const result = yield userService.getUserById(userId);
    return res.status(result.statusCode).json(result.message);
}));
exports.default = userRouter;
//# sourceMappingURL=users.route.js.map