/**
 * nodemailer.js — safe, optional SMTP transport
 *
 * The email system is OPTIONAL. If SMTP_USER or SMTP_PASS are absent the
 * backend starts normally and all email sends are silently skipped.
 *
 * Gmail users:
 *   • 2-Step Verification must be enabled on your Google account.
 *   • Generate an App Password at myaccount.google.com → Security → App Passwords.
 *   • Paste the 16-character App Password into SMTP_PASS (no spaces).
 *   • SMTP_HOST=smtp.gmail.com  SMTP_PORT=587
 *
 * Brevo (default) users:
 *   • SMTP_USER = the login shown on app.brevo.com → SMTP & API → SMTP.
 *   • SMTP_PASS = the SMTP key generated there (NOT your Brevo login password).
 */

import nodemailer from 'nodemailer';

// ── Readiness flag ─────────────────────────────────────────────────────────
// Set to true only after transporter.verify() succeeds.
// All send helpers check this before calling sendMail.
let emailReady = false;

// ── Credential check ───────────────────────────────────────────────────────
const SMTP_HOST = (process.env.SMTP_HOST || 'smtp-relay.brevo.com').trim();
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = (process.env.SMTP_USER || '').trim();
const SMTP_PASS = (process.env.SMTP_PASS || '').trim();

let transporter = null;

if (!SMTP_USER || !SMTP_PASS) {
    // Missing credentials — disable email silently so the backend starts cleanly.
    console.warn('[Nodemailer] SMTP disabled: missing SMTP_USER or SMTP_PASS. Email sending will be skipped.');
} else {
    // Credentials present — create transporter and verify asynchronously.
    // verify() runs after startup so it never blocks the HTTP server.
    transporter = nodemailer.createTransport({
        host:   SMTP_HOST,
        port:   SMTP_PORT,
        secure: SMTP_PORT === 465,   // true = TLS, false = STARTTLS
        auth:   { user: SMTP_USER, pass: SMTP_PASS },
    });

    transporter.verify()
        .then(() => {
            emailReady = true;
            console.log('[Nodemailer] SMTP connection OK — ready to send email.');
        })
        .catch(err => {
            console.warn('[Nodemailer] SMTP auth failed:', err.message);
            console.warn('[Nodemailer] Email sending disabled until SMTP config is fixed.');
        });
}

// ── Safe send helper ───────────────────────────────────────────────────────
/**
 * Sends an email safely.
 *
 * - Returns true  if the message was accepted by the SMTP server.
 * - Returns false if SMTP is not ready or sendMail throws.
 * - Never propagates an exception — callers do not need their own try/catch.
 *
 * @param {object} mailOptions  – standard nodemailer mailOptions
 * @returns {Promise<boolean>}
 */
export async function sendEmail(mailOptions) {
    if (!emailReady || !transporter) {
        console.warn(
            `[Nodemailer] Skipped email to <${mailOptions.to}> (${mailOptions.subject}): SMTP is not ready.`
        );
        return false;
    }
    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (err) {
        console.error('[Nodemailer] sendMail failed:', err.message);
        return false;
    }
}

export { emailReady };
export default transporter;
