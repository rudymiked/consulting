// server/index.ts (or index.js if you're not using TypeScript)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sendEmail } from './sendEmail';

try {
  dotenv.config(); // Load environment variables from .env

  const app = express();
  const PORT =  process.env.PORT || 4001;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Routes
  app.get('/', (req, res) => {
    res.send('API is running 🚀');
  });

  app.post('/contact', async (req, res) => {
    const { to, subject, text, html } = req.body;

    try {
      await sendEmail({ to, subject, text, html });
      res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
      console.error('Email error:', error);
      res.status(500).json({ error: 'Failed to send email' + error.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`Server running`);
  });
} catch (error) {
  console.error('Error loading environment variables:', error);
  process.exit(1); // Exit the process if .env loading fails
}
