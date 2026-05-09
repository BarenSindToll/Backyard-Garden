import nodemailer from 'nodemailer';

// Warn at startup if any required SMTP variable is missing
const missingVars = ['SMTP_USER', 'SMTP_PASS', 'SENDER_EMAIL'].filter(k => !process.env[k]);
if (missingVars.length > 0) {
    console.warn(`[Nodemailer] Missing env vars: ${missingVars.join(', ')} — email sending will fail.`);
}

// Brevo SMTP relay (smtp-relay.brevo.com : 587)
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Verify the SMTP connection at startup — logs success or exact auth error
transporter.verify((error) => {
    if (error) {
        console.error('[Nodemailer] SMTP auth failed:', error.message);
        console.error('[Nodemailer] Check SMTP_USER and SMTP_PASS in .env — see .env.example for instructions.');
    } else {
        console.log('[Nodemailer] SMTP connection OK — ready to send email.');
    }
});

export default transporter;