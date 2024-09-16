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
exports.TeamMemberService = void 0;
// teamMember.service.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class TeamMemberService {
    getAllTeamMembers() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const teamMembers = yield prisma.teamMember.findMany();
                return { statusCode: 200, message: teamMembers };
            }
            catch (error) {
                return { statusCode: 500, message: error.message };
            }
        });
    }
    getTeamMemberById(teamMemberId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const teamMember = yield prisma.teamMember.findUnique({ where: { id: Number(teamMemberId) } });
                if (!teamMember) {
                    return { statusCode: 404, message: 'Team member not found' };
                }
                return { statusCode: 200, message: teamMember };
            }
            catch (error) {
                return { statusCode: 500, message: error.message };
            }
        });
    }
    createTeamMember(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Log data to ensure correct values are passed
                console.log(data);
                const newTeamMember = yield prisma.teamMember.create({
                    data: {
                        fullName: data.fullName, // Ensure this is a string value
                        role: data.role || '', // Fallback to empty string if undefined
                        description: data.description || '', // Fallback
                        title: data.title || '', // Fallback
                        imagePath: (_a = data.imagePath) !== null && _a !== void 0 ? _a : '', // Handle optional imagePath correctly
                    },
                });
                return { statusCode: 201, message: newTeamMember };
            }
            catch (error) {
                return { statusCode: 500, message: error.message };
            }
        });
    }
    // async updateTeamMember(teamMemberId: string, data: { fullName?: string; role?: string; description?: string; title?: string; imagePath?: string }) {
    //   try {
    //     const updatedTeamMember = await prisma.teamMember.update({
    //       where: { id: Number(teamMemberId) },
    //       data,
    //     });
    //     return { statusCode: 200, message: updatedTeamMember };
    //   } catch (error: any) {
    //     throw new Error(`Error updating team member: ${error.message}`);
    //   }
    // }
    updateTeamMember(teamMemberId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const updateData = {};
                if (data.fullName !== undefined)
                    updateData.fullName = data.fullName;
                if (data.role !== undefined)
                    updateData.role = data.role;
                if (data.description !== undefined)
                    updateData.description = data.description;
                if (data.title !== undefined)
                    updateData.title = data.title;
                if (data.imagePath !== undefined)
                    updateData.imagePath = data.imagePath;
                const updatedTeamMember = yield prisma.teamMember.update({
                    where: { id: Number(teamMemberId) },
                    data: updateData,
                });
                return { statusCode: 200, message: updatedTeamMember };
            }
            catch (error) {
                return { statusCode: 500, message: `Error updating team member: ${error.message}` };
            }
        });
    }
    deleteTeamMember(teamMemberId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const deletedTeamMember = yield prisma.teamMember.delete({
                    where: { id: Number(teamMemberId) },
                });
                return { statusCode: 200, message: deletedTeamMember };
            }
            catch (error) {
                throw new Error(`Error deleting team member: ${error.message}`);
            }
        });
    }
}
exports.TeamMemberService = TeamMemberService;
//# sourceMappingURL=teamMember.service.js.map