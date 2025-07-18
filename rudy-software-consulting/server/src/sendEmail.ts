import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.RUDYARD_EMAIL_USERNAME || process.env.EMAIL_USERNAME,
    to: process.env.EMAIL_USERNAME, //options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${mailOptions.to} from ${mailOptions.from}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
