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
exports.UserService = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
class UserService {
    registerUser(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Hash the password
                const hashedPassword = yield bcryptjs_1.default.hash(data.password, 10);
                // Create user
                const user = yield prisma.user.create({
                    data: {
                        name: data.name,
                        surname: data.surname,
                        email: data.email,
                        password: hashedPassword,
                    },
                });
                // Generate JWT token
                const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, {
                    expiresIn: '1h',
                });
                return { statusCode: 201, message: { token, user } };
            }
            catch (error) {
                if (error.code === 'P2002') {
                    return { statusCode: 400, message: 'Email already exists' };
                }
                return { statusCode: 500, message: 'Internal server error' };
            }
        });
    }
    loginUser(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield prisma.user.findUnique({
                    where: { email: data.email },
                });
                if (!user || !(yield bcryptjs_1.default.compare(data.password, user.password))) {
                    return { statusCode: 401, message: 'Invalid credentials' };
                }
                const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, {
                    expiresIn: '1h',
                });
                return { statusCode: 200, message: { token, user } };
            }
            catch (error) {
                return { statusCode: 500, message: 'Internal server error' };
            }
        });
    }
    getUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield prisma.user.findUnique({ where: { id: Number(userId) } });
                if (!user)
                    return { statusCode: 404, message: 'User not found' };
                return { statusCode: 200, message: user };
            }
            catch (error) {
                return { statusCode: 500, message: 'Internal server error' };
            }
        });
    }
}
exports.UserService = UserService;
//# sourceMappingURL=users.service.js.map