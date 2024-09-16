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
exports.ManageUserService = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
class ManageUserService {
    getAllUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const usersList = yield prisma.user.findMany();
                return { statusCode: 200, message: usersList };
            }
            catch (error) {
                return { statusCode: 500, message: error.message };
            }
        });
    }
    getUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield prisma.user.findUnique({ where: { id: Number(userId) } });
                if (!user) {
                    return { statusCode: 404, message: 'User not found' };
                }
                return { statusCode: 200, message: user };
            }
            catch (error) {
                return { statusCode: 500, message: error.message };
            }
        });
    }
    createUser(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Hash the password before saving to the database
                const hashedPassword = yield bcryptjs_1.default.hash(data.password, 10);
                // Create user with the hashed password
                const newUser = yield prisma.user.create({
                    data: Object.assign(Object.assign({}, data), { password: hashedPassword }),
                });
                return { statusCode: 201, message: newUser };
            }
            catch (error) {
                throw new Error(`Error creating user: ${error.message}`);
            }
        });
    }
    deleteUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.user.delete({
                    where: { id: Number(userId) },
                });
                return { statusCode: 204, message: 'User deleted' };
            }
            catch (error) {
                throw new Error(`Error deleting user: ${error.message}`);
            }
        });
    }
    updateUser(userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const updatedUser = yield prisma.user.update({
                    where: { id: Number(userId) },
                    data,
                });
                return { statusCode: 200, message: updatedUser };
            }
            catch (error) {
                throw new Error(`Error updating user: ${error.message}`);
            }
        });
    }
}
exports.ManageUserService = ManageUserService;
//# sourceMappingURL=manageUsers.service.js.map