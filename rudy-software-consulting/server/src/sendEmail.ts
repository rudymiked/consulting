import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,  //'mail.privateemail.com' or 'gmail',
    port: Number(process.env.EMAIL_PORT), // Use 587 for TLS/STARTTLS, 465 for SSL
    secure: Boolean(process.env.EMAIL_SECURE), // true for SSL (port 465), false for TLS (port 587)
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    },
    logger: true,
    debug: true
  });

  // const transporter = nodemailer.createTransport({
  //   service: 'gmail',
  //   auth: {
  //     user: process.env.EMAIL_USERNAME,
  //     pass: process.env.EMAIL_PASSWORD,
  //   },
  // });

  await transporter.verify();

  const mailOptions = {
    from: process.env.RUDYARD_EMAIL_USERNAME || process.env.EMAIL_USERNAME,
    to: process.env.RUDYARD_EMAIL_USERNAME, //options.to,
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
