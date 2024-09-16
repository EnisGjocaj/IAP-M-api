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
exports.sendApplicationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Create a transporter for sending emails using Gmail
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});
// Function to send an application email
const sendApplicationEmail = (toEmail, name, type) => __awaiter(void 0, void 0, void 0, function* () {
    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: toEmail,
        subject: 'Application Received',
        text: `Dear ${name},\n\nThank you for applying to our ${type} program. We have received your application and will get back to you shortly.\n\nBest regards,\nThe Team`,
    };
    try {
        yield transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    }
    catch (error) {
        console.error('Error sending email:', error);
    }
});
exports.sendApplicationEmail = sendApplicationEmail;
//# sourceMappingURL=mailer.js.map