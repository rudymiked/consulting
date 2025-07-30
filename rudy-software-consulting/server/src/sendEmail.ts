import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  let transporter;

  const useGmail = (process.env.EMAIL_USE_GMAIL || '').trim().toLowerCase() === 'true';

  console.log('Transport using Gmail?', useGmail);
  console.log('Host used:', process.env.EMAIL_HOST);

  if (useGmail) {
      transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_PASSWORD,
      },
    });
  } else {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'mail.privateemail.com',  //'mail.privateemail.com' or 'gmail',
      port: Number(process.env.EMAIL_PORT) || 465, // Use 587 for TLS/STARTTLS, 465 for SSL
      secure: Boolean(process.env.EMAIL_SECURE) || true, // true for SSL (port 465), false for TLS (port 587)
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      },
      logger: true,
      debug: true
    });
  }

  await transporter.verify();

  const mailOptions = {
    from: process.env.RUDYARD_EMAIL_USERNAME, // || process.env.EMAIL_USERNAME,
    to: process.env.RUDYARD_EMAIL_USERNAME, //options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  console.log('Sending email with options:', mailOptions);

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${mailOptions.to} from ${mailOptions.from}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
