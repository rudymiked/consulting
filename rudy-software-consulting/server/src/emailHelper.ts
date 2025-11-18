import nodemailer from 'nodemailer';
import { insertEntity, queryEntities, updateEntity } from './tableClientHelper';
import { trackEvent, trackException } from './telemetry';

export interface IEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  sent: boolean;
}

export interface IContactLog extends IEmailOptions {
  partitionKey: string;
  rowKey: string;
  timestamp: string;
}

export async function sendEmail(options: IEmailOptions): Promise<void> {
  let transporter;

  const useGmail = (process.env.EMAIL_USE_GMAIL || '').trim().toLowerCase() === 'true';

  console.log('Transport using Gmail?', useGmail);
  trackEvent('SendEmail_Attempt', { to: options.to, subject: options.subject });
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
    const secure = process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE.trim().toLowerCase() === 'true' : true;
    const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : (secure ? 465 : 587);

    console.log('Using secure:', secure);
    console.log('Using port:', port);
    console.log('Using host:', process.env.EMAIL_HOST || 'mail.privateemail.com');

    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'mail.privateemail.com',  //'mail.privateemail.com' or 'gmail',
      port: port, // Use 587 for TLS/STARTTLS, 465 for SSL
      secure: secure, // true for SSL (port 465), false for TLS (port 587)
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
    trackEvent('SendEmail_Success', { to: mailOptions.to, subject: mailOptions.subject });

    //update contact log as sent
    try {
      await insertIntoContactLogs({ ...options, sent: true });
    } catch (error) {
      console.error('Error inserting sent email into ContactLogs:', error);
    }
  } catch (error) {
    trackException(error, { to: mailOptions.to, subject: mailOptions.subject });
    console.error('Error sending email:', error);
    throw error;
  }
}

export async function insertIntoContactLogs(options: IEmailOptions): Promise<void> {
  const { to, subject, text, html } = options;
  // Azure Table Storage requires PartitionKey and RowKey and disallows undefined values.
  const entity: IContactLog = {
    partitionKey: to || 'unknown',
    rowKey: `contact-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    to,
    subject,
    text,
    html,
    timestamp: new Date().toISOString(),
    sent: false,
  };

  // Remove undefined properties (Table service rejects properties with undefined values)
  Object.keys(entity).forEach(k => {
    if (entity[k] === undefined) delete entity[k];
  });

  insertEntity('ContactLogs', entity).then(() => {
    console.log('Email data inserted into ContactLogs table:', entity);
    trackEvent('InsertContactLog_Success', { to, subject });
  }).catch(error => {
    trackException(error, { to, subject });
    console.error('Error inserting email data into ContactLogs table:', error);
    throw error;
  });
}

export async function sendEmailsFromLog(): Promise<void> {
  try {
    const contactLogs: IContactLog[] = await queryEntities('ContactLogs', "sent eq false");

    for (const log of contactLogs) {
      const emailOptions: IEmailOptions = {
        to: log.to,
        subject: log.subject,
        text: log.text,
        html: log.html,
        sent: true
      };

      await sendEmail(emailOptions);
      console.log(`Email sent from log: ${log.to} - ${log.subject}`);

      log.sent = true; // Mark as sent
      log.timestamp = new Date().toISOString(); // Update timestamp
      console.log('Updating log entry:', log);

      await updateEntity('ContactLogs', log); // Update the log entry
      trackEvent('UpdateContactLog_Sent', { to: log.to, subject: log.subject });
    }
  } catch (error) {
    trackException(error);
    console.error('Error in sendAndLogEmail:', error);
    throw error;
  }
}