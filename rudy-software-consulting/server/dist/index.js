"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const sendEmail_1 = require("./sendEmail");
dotenv_1.default.config(); // Load environment variables from .env
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.get('/api', (_, res) => {
    res.send('API is running 🚀');
});
app.post('/api/contact', async (req, res) => {
    const { to, subject, text, html } = req.body;
    try {
        await (0, sendEmail_1.sendEmail)({ to, subject, text, html });
        res.status(200).json({ message: 'Email sent successfully' });
    }
    catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: 'Failed to send email: ' + error.message });
    }
});
app.get('/api/ping', (_, res) => {
    res.json({ message: 'pong' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Rudyard Software Consulting server is live at http://localhost:${PORT}`);
});
