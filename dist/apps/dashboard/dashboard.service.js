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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
// src/services/dashboard.service.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class DashboardService {
    getStatistics() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get counts for users, applications, and team members
                const userCount = yield prisma.user.count();
                const applicationCount = yield prisma.application.count();
                const teamMemberCount = yield prisma.teamMember.count();
                return { statusCode: 200, message: { users: userCount, applications: applicationCount, teamMembers: teamMemberCount } };
            }
            catch (error) {
                return { statusCode: 500, message: error.message };
            }
        });
    }
    getTrainingApplications() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get counts of applications by training type
                const trainingCounts = yield prisma.application.groupBy({
                    by: ['type'],
                    _count: {
                        type: true,
                    },
                });
                const formattedCounts = trainingCounts.map((item) => ({
                    trainingType: item.type,
                    count: item._count.type,
                }));
                return { statusCode: 200, message: formattedCounts };
            }
            catch (error) {
                return { statusCode: 500, message: error.message };
            }
        });
    }
}
exports.DashboardService = DashboardService;
//# sourceMappingURL=dashboard.service.js.map