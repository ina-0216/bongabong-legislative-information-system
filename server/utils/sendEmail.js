const nodemailer = require('nodemailer');

const RESEND_API_URL = 'https://api.resend.com/emails';
const EMAIL_REQUEST_TIMEOUT_MS = 12_000;

// Optional factories keep the HTTPS and local SMTP delivery paths injectable;
// existing callers continue to pass the same three mail arguments.
const sendEmail = async (to, subject, text, options = {}) => {
  const createTransport = options.createTransport || nodemailer.createTransport;
  const fetchImpl = options.fetch || globalThis.fetch;
  const emailUser = process.env.EMAIL_USER?.trim();
  // Google displays app passwords in four-character groups; spaces are visual
  // separators and must not be sent as part of SMTP authentication.
  const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, '');
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  // Brevo credentials must be read upfront so the provider resolution logic
  // can correctly prefer 'brevo' when both Brevo and Resend keys are present.
  const brevoApiKey = process.env.BREVO_API_KEY?.trim();
  const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL?.trim();

  const emailProvider = options.provider?.trim().toLowerCase()
    || process.env.EMAIL_PROVIDER?.trim().toLowerCase()
    || (brevoApiKey && brevoSenderEmail ? 'brevo' : (resendApiKey && resendFromEmail ? 'resend' : 'smtp'));

  try {
    if (emailProvider === 'brevo') {
      if (!brevoApiKey || !brevoSenderEmail) {
        throw new Error('BREVO_API_KEY and BREVO_SENDER_EMAIL are required when EMAIL_PROVIDER=brevo.');
      }
      if (typeof fetchImpl !== 'function') {
        throw new Error('HTTPS email delivery requires the built-in fetch API.');
      }

      const response = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'B-LIS Admin', email: brevoSenderEmail },
          to: [{ email: to }],
          subject,
          textContent: text,
        }),
        signal: AbortSignal.timeout(EMAIL_REQUEST_TIMEOUT_MS),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const reason = typeof result.message === 'string' ? result.message : `HTTP ${response.status}`;
        throw new Error(`Brevo email API rejected the request: ${reason}`);
      }

      console.log(`📧 Email accepted by Brevo (Message ID: ${result.messageId || 'unknown'})`);
      return true;
    }

    if (emailProvider === 'resend') {
      if (!resendApiKey) {
        throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend.');
      }
      if (!resendFromEmail) {
        throw new Error('RESEND_FROM_EMAIL is required when EMAIL_PROVIDER=resend.');
      }
      if (typeof fetchImpl !== 'function') {
        throw new Error('HTTPS email delivery requires the built-in fetch API.');
      }

      const response = await fetchImpl(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: [to],
          subject,
          text,
        }),
        signal: AbortSignal.timeout(EMAIL_REQUEST_TIMEOUT_MS),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const reason = typeof result.message === 'string' ? result.message : `HTTP ${response.status}`;
        throw new Error(`Resend email API rejected the request: ${reason}`);
      }

      console.log(`📧 Email accepted by Resend (Message ID: ${result.id || 'unknown'})`);
      return true;
    }

    if (emailProvider !== 'smtp' && emailProvider !== 'gmail') {
      throw new Error(`Unsupported EMAIL_PROVIDER: ${emailProvider}. Use brevo, resend, smtp, or gmail.`);
    }

    // Note: Render's free plan blocks outbound SMTP egress (ports 465/587).
    // If hosting on Render Free, configure EMAIL_PROVIDER=brevo or resend instead.
    if (process.env.NODE_ENV === 'production' && (!emailUser || !emailPass)) {
      throw new Error('Set RESEND_API_KEY and RESEND_FROM_EMAIL (or EMAIL_USER and EMAIL_PASS for Gmail SMTP) for production email delivery.');
    }

    const isMock = !emailUser || !emailPass;

    // SEC-06: In production, email credentials are required — there is no mock
    // fallback. If credentials are missing, the server will fail to boot (see
    // server/server.js startup validation), so reaching this code path with
    // production env vars absent should not happen in a properly configured
    // deployment. We keep the old guard for safety, but it should never trigger
    // in a deployed production environment.
    if (isMock && process.env.NODE_ENV === 'production') {
      throw new Error(
        'SMTP credentials (EMAIL_USER / EMAIL_PASS) are missing in production. ' +
        'Set them in the environment before starting the server.'
      );
    }

    if (isMock) {
      console.log(`\n✉️ === MOCK EMAIL SENT ===`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body:\n${text}`);
      console.log(`=========================\n`);
      console.log(`⚠️ Warning: EMAIL_USER and EMAIL_PASS are not set in .env`);
      console.log(`⚠️ Real emails will not be sent until they are configured.\n`);
      return true;
    }

    const transporter = createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const mailOptions = {
      from: `"B-LIS Admin" <${emailUser}>`,
      to,
      subject,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Real email sent successfully to ${to} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('❌ Email delivery failed:', error.message);
    const deliveryError = new Error('Failed to send email. Please check server email configuration.');
    deliveryError.statusCode = 503;
    throw deliveryError;
  }
};

module.exports = sendEmail;
