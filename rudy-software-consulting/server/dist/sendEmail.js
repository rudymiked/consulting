"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
async function sendEmail(options) {
    const transporter = nodemailer_1.default.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
        },
    });
    const mailOptions = {
        from: process.env.RUDYARD_EMAIL_USERNAME || process.env.EMAIL_USERNAME,
        to: process.env.EMAIL_USERNAME,
        subject: options.subject,
        text: options.text,
        html: options.html,
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${options.to}`);
    }
    catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}
exports.sendEmail = sendEmail;
