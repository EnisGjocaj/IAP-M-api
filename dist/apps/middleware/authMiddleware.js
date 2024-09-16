"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateJWT = (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1]; // Bearer token format
    if (token) {
        jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403); // Invalid token
            }
            req.user = user; // Attach user info to request
            next();
        });
    }
    else {
        res.sendStatus(401); // No token provided
    }
};
exports.authenticateJWT = authenticateJWT;
//# sourceMappingURL=authMiddleware.js.map