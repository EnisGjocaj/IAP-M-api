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
exports.ApplicationService = void 0;
const client_1 = require("@prisma/client");
const mailer_1 = require("./mailer");
const prisma = new client_1.PrismaClient();
class ApplicationService {
    getAllApplications() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const applications = yield prisma.application.findMany();
                return { statusCode: 200, message: applications };
            }
            catch (error) {
                return { statusCode: 500, message: error.message };
            }
        });
    }
    getApplicationById(applicationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const application = yield prisma.application.findUnique({
                    where: { id: Number(applicationId) },
                });
                if (!application) {
                    return { statusCode: 404, message: 'Application not found' };
                }
                return { statusCode: 200, message: application };
            }
            catch (error) {
                return { statusCode: 500, message: error.message };
            }
        });
    }
    // async createApplication(data: { name: string; surname: string; email: string; type: 'INFORMATION_SCIENCE' | 'AGROBUSINESS' | 'ACCOUNTING' | 'MARKETING' }) {
    //   try {
    //     // Create the new application
    //     const newApplication = await prisma.application.create({ data });
    //     // Send the application email
    //     await sendApplicationEmail(data.email, data.name, data.type);
    //     return { statusCode: 201, message: newApplication };
    //   } catch (error: any) {
    //     throw new Error(`Error creating application: ${error.message}`);
    //   }
    // }
    createApplication(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Find or create the user
                let user = yield prisma.user.findUnique({
                    where: { email: data.email },
                });
                if (!user) {
                    // Create the user if they do not exist
                    user = yield prisma.user.create({
                        data: {
                            email: data.email,
                            name: data.name,
                            surname: data.surname,
                            // You might need to provide a default password if creating a user is mandatory
                            password: 'defaultPassword123', // Handle default password or adjust logic accordingly
                        },
                    });
                }
                const applicationType = data.type;
                // Create a new application for the user
                const newApplication = yield prisma.application.create({
                    data: {
                        name: data.name,
                        surname: data.surname,
                        email: data.email,
                        type: applicationType, // Use the TrainingType enum
                        userId: user.id,
                    },
                });
                // Send the application email
                yield (0, mailer_1.sendApplicationEmail)(data.email, data.name, data.type);
                return { statusCode: 201, message: newApplication };
            }
            catch (error) {
                console.error('Error creating application:', error);
                throw new Error(`Error creating application: ${error.message}`);
            }
        });
    }
    updateApplication(applicationId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const updatedApplication = yield prisma.application.update({
                    where: { id: Number(applicationId) },
                    data,
                });
                return { statusCode: 200, message: updatedApplication };
            }
            catch (error) {
                throw new Error(`Error updating application: ${error.message}`);
            }
        });
    }
    deleteApplication(applicationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const deletedApplication = yield prisma.application.delete({
                    where: { id: Number(applicationId) },
                });
                return { statusCode: 200, message: deletedApplication };
            }
            catch (error) {
                throw new Error(`Error deleting application: ${error.message}`);
            }
        });
    }
}
exports.ApplicationService = ApplicationService;
//# sourceMappingURL=application.service.js.map