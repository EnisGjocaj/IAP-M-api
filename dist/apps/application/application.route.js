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
const application_service_1 = require("./application.service");
const applicationService = new application_service_1.ApplicationService();
const applicationRouter = express_1.default.Router();
// Get all applications
applicationRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const applications = yield applicationService.getAllApplications();
        return res.status(200).json(applications);
    }
    catch (error) {
        console.error('Error fetching applications:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Get application by ID
applicationRouter.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const application = yield applicationService.getApplicationById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }
        return res.status(200).json(application);
    }
    catch (error) {
        console.error('Error fetching application:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Create application
applicationRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newApplication = yield applicationService.createApplication(req.body);
        return res.status(201).json(newApplication);
    }
    catch (error) {
        console.error('Error creating application:', error);
        return res.status(500).json({ message: 'Error creating application' });
    }
}));
// Update application
applicationRouter.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updatedApplication = yield applicationService.updateApplication(req.params.id, req.body);
        return res.status(200).json(updatedApplication);
    }
    catch (error) {
        console.error('Error updating application:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Delete application
applicationRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield applicationService.deleteApplication(req.params.id);
        return res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting application:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
exports.default = applicationRouter;
//# sourceMappingURL=application.route.js.map