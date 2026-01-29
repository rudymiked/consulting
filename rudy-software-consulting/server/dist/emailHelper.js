"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.insertIntoContactLogs = insertIntoContactLogs;
exports.sendEmailsFromLog = sendEmailsFromLog;
const nodemailer_1 = __importDefault(require("nodemailer"));
const tableClientHelper_1 = require("./tableClientHelper");
const telemetry_1 = require("./telemetry");
const models_1 = require("./models");
async function sendEmail(options) {
    let transporter;
    const useGmail = (process.env.EMAIL_USE_GMAIL || '').trim().toLowerCase() === 'true';
    console.log('Transport using Gmail?', useGmail);
    (0, telemetry_1.trackEvent)('SendEmail_Attempt', { to: options.to, subject: options.subject });
    console.log('Host used:', process.env.EMAIL_HOST);
    if (useGmail) {
        transporter = nodemailer_1.default.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.GMAIL_USERNAME,
                pass: process.env.GMAIL_PASSWORD,
            },
        });
    }
    else {
        const secure = process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE.trim().toLowerCase() === 'true' : true;
        const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : (secure ? 465 : 587);
        console.log('Using secure:', secure);
        console.log('Using port:', port);
        console.log('Using host:', process.env.EMAIL_HOST || 'mail.privateemail.com');
        transporter = nodemailer_1.default.createTransport({
            host: process.env.EMAIL_HOST || 'mail.privateemail.com', //'mail.privateemail.com' or 'gmail',
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
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
    };
    console.log('Sending email with options:', mailOptions);
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${mailOptions.to} from ${mailOptions.from}`);
        (0, telemetry_1.trackEvent)('SendEmail_Success', { to: mailOptions.to, subject: mailOptions.subject });
        //update contact log as sent
        try {
            await insertIntoContactLogs({ ...options, sent: true });
        }
        catch (error) {
            console.error('Error inserting sent email into ContactLogs:', error);
        }
    }
    catch (error) {
        (0, telemetry_1.trackException)(error, { to: mailOptions.to, subject: mailOptions.subject });
        console.error('Error sending email:', error);
        throw error;
    }
}
async function insertIntoContactLogs(options) {
    const { to, subject, text, html } = options;
    // Azure Table Storage requires PartitionKey and RowKey and disallows undefined values.
    const entity = {
        partitionKey: to || 'unknown',
        rowKey: `contact-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        to,
        subject,
        text,
        html,
        sent: false,
    };
    // Remove undefined properties (Table service rejects properties with undefined values)
    Object.keys(entity).forEach(k => {
        if (entity[k] === undefined)
            delete entity[k];
    });
    (0, tableClientHelper_1.insertEntity)(models_1.TableNames.ContactLogs, entity).then(() => {
        console.log('Email data inserted into ContactLogs table:', entity);
        (0, telemetry_1.trackEvent)('InsertContactLog_Success', { to, subject });
    }).catch(error => {
        (0, telemetry_1.trackException)(error, { to, subject });
        console.error('Error inserting email data into ContactLogs table:', error);
        throw error;
    });
}
async function sendEmailsFromLog() {
    try {
        const contactLogs = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.ContactLogs, "sent eq false");
        for (const log of contactLogs) {
            const emailOptions = {
                to: log.to,
                subject: log.subject,
                text: log.text,
                html: log.html,
                sent: true
            };
            await sendEmail(emailOptions);
            console.log(`Email sent from log: ${log.to} - ${log.subject}`);
            log.sent = true; // Mark as sent
            console.log('Updating log entry:', log);
            await (0, tableClientHelper_1.updateEntity)(models_1.TableNames.ContactLogs, log); // Update the log entry
            (0, telemetry_1.trackEvent)('UpdateContactLog_Sent', { to: log.to, subject: log.subject });
        }
    }
    catch (error) {
        (0, telemetry_1.trackException)(error);
        console.error('Error in sendAndLogEmail:', error);
        throw error;
    }
}
