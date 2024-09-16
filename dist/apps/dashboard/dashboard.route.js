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
// src/routes/dashboard.router.ts
const express_1 = __importDefault(require("express"));
const dashboard_service_1 = require("./dashboard.service");
const dashboardService = new dashboard_service_1.DashboardService();
const dashboardRouter = express_1.default.Router();
// Get dashboard statistics
dashboardRouter.get('/statistics', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const statistics = yield dashboardService.getStatistics();
        return res.status(statistics.statusCode).json(statistics.message);
    }
    catch (error) {
        console.error('Error fetching dashboard statistics:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Get training application counts
dashboardRouter.get('/training-applications', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const trainingApplications = yield dashboardService.getTrainingApplications();
        return res.status(trainingApplications.statusCode).json(trainingApplications.message);
    }
    catch (error) {
        console.error('Error fetching training applications:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
exports.default = dashboardRouter;
//# sourceMappingURL=dashboard.route.js.map