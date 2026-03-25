import nodemailer from 'nodemailer';

const normalizeEnvValue = (value?: string) => value?.trim() || undefined;

const smtpHost = normalizeEnvValue(process.env.SMTP_HOST || process.env.EMAIL_HOST);
const parsedSmtpPort = Number.parseInt(normalizeEnvValue(process.env.SMTP_PORT || process.env.EMAIL_PORT) || '587', 10);
const smtpPort = Number.isNaN(parsedSmtpPort) ? 587 : parsedSmtpPort;
const explicitSecure = normalizeEnvValue(process.env.SMTP_SECURE)?.toLowerCase();
const smtpSecure = explicitSecure === undefined ? smtpPort === 465 : explicitSecure === 'true';
const smtpUser = normalizeEnvValue(process.env.SMTP_USER || process.env.EMAIL_USER);
const rawSmtpPass = normalizeEnvValue(process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD);
const smtpPass = smtpHost?.includes('gmail.com')
  ? rawSmtpPass?.replace(/\s+/g, '')
  : rawSmtpPass;
const fromEmail = process.env.EMAIL_FROM || smtpUser;
const notificationEmail = process.env.NOTIFICATION_EMAIL || process.env.EMAIL_TO || smtpUser;
let emailAuthFailed = false;

// Create reusable transporter
const createTransporter = () => {
  if (!smtpHost || !smtpUser || !smtpPass) {
    const missing: string[] = [];
    if (!smtpHost) missing.push('SMTP_HOST/EMAIL_HOST');
    if (!smtpUser) missing.push('SMTP_USER/EMAIL_USER');
    if (!smtpPass) missing.push('SMTP_PASS/EMAIL_PASS');
    console.warn(`⚠️ Email configuration incomplete (missing: ${missing.join(', ')}). Email notifications will be disabled.`);
    return null;
  }

  if (smtpHost.includes('gmail.com') && rawSmtpPass && rawSmtpPass !== smtpPass) {
    console.warn('⚠️ Gmail app password contained spaces and was normalized automatically.');
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

const transporter = createTransporter();

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
}

/**
 * Send email notification for new contact form submission
 */
export async function sendContactNotification(data: ContactFormData): Promise<boolean> {
  if (!transporter) {
    console.warn('Email transporter not configured, skipping notification');
    return false;
  }

  if (emailAuthFailed) {
    console.warn('Email notifications are temporarily disabled due to SMTP auth failure. Restart server after fixing credentials.');
    return false;
  }

  if (!notificationEmail) {
    console.warn('Notification recipient email is not configured (NOTIFICATION_EMAIL or EMAIL_TO).');
    return false;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-apple-disable-message-reformatting">
      <meta name="format-detection" content="telephone=no, address=no, email=no, date=no">
      <!--[if mso]>
      <style type="text/css">
        body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
      </style>
      <![endif]-->
      <style>
        /* Reset styles */
        body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
          line-height: 1.6; 
          color: #1f2937; 
          margin: 0 !important;
          padding: 0 !important;
          background-color: #f3f4f6;
          width: 100% !important;
          min-width: 100% !important;
        }
        .wrapper { 
          padding: 24px 12px;
          width: 100%;
          box-sizing: border-box;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: #ffffff; 
          border-radius: 12px; 
          overflow: hidden; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          width: 100%;
          box-sizing: border-box;
        }
        .header { 
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); 
          color: white; 
          padding: 32px 20px; 
          text-align: center; 
        }
        .header-icon { 
          width: 48px; 
          height: 48px; 
          background: rgba(255,255,255,0.15); 
          border-radius: 10px; 
          margin: 0 auto 12px; 
          display: table;
        }
        .header-icon svg {
          display: table-cell;
          vertical-align: middle;
        }
        .header h1 { 
          margin: 0; 
          font-size: 20px; 
          font-weight: 600; 
          letter-spacing: -0.025em;
          word-wrap: break-word;
        }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
        .content { 
          padding: 24px 16px;
        }
        .field { margin-bottom: 20px; }
        .label { 
          font-weight: 600; 
          color: #6b7280; 
          font-size: 11px; 
          text-transform: uppercase; 
          letter-spacing: 0.05em; 
          margin-bottom: 6px; 
          display: block;
        }
        .label-inner {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .label svg { width: 14px; height: 14px; vertical-align: middle; }
        .value { 
          background: #f9fafb; 
          padding: 12px 14px; 
          border-radius: 8px; 
          border: 1px solid #e5e7eb; 
          font-size: 14px;
          color: #111827;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .value a { color: #2563eb; text-decoration: none; word-break: break-all; }
        .message-box { 
          background: #f9fafb; 
          padding: 16px; 
          border-radius: 8px; 
          border-left: 3px solid #3b82f6; 
          font-size: 14px;
          color: #374151;
          white-space: pre-wrap;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .actions { 
          text-align: center; 
          padding: 8px 0 20px; 
        }
        .reply-btn { 
          display: inline-block; 
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); 
          color: white !important; 
          padding: 14px 28px; 
          border-radius: 8px; 
          text-decoration: none; 
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
          -webkit-text-size-adjust: none;
        }
        .footer { 
          background: #f9fafb; 
          padding: 20px 16px; 
          text-align: center; 
          font-size: 11px; 
          color: #6b7280; 
          border-top: 1px solid #e5e7eb;
        }
        .footer p { margin: 3px 0; }
        
        /* Mobile-specific styles */
        @media only screen and (max-width: 480px) {
          .wrapper { padding: 12px 8px !important; }
          .header { padding: 24px 16px !important; }
          .header h1 { font-size: 18px !important; }
          .header p { font-size: 12px !important; }
          .content { padding: 20px 14px !important; }
          .field { margin-bottom: 16px !important; }
          .value { padding: 10px 12px !important; font-size: 13px !important; }
          .message-box { padding: 14px !important; font-size: 13px !important; }
          .reply-btn { 
            padding: 12px 24px !important; 
            font-size: 13px !important;
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .footer { padding: 16px 14px !important; }
          .footer p { font-size: 10px !important; }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 12px auto; display: block;">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <h1>New Contact Form Submission</h1>
            <p>Someone reached out through your portfolio</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">
                <span class="label-inner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  From
                </span>
              </div>
              <div class="value">${data.name}</div>
            </div>
            <div class="field">
              <div class="label">
                <span class="label-inner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  Email Address
                </span>
              </div>
              <div class="value"><a href="mailto:${data.email}">${data.email}</a></div>
            </div>
            ${data.phone ? `
            <div class="field">
              <div class="label">
                <span class="label-inner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  Phone Number
                </span>
              </div>
              <div class="value">${data.phone}</div>
            </div>
            ` : ''}
            <div class="field">
              <div class="label">
                <span class="label-inner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="4" y1="9" x2="20" y2="9"></line>
                    <line x1="4" y1="15" x2="20" y2="15"></line>
                    <line x1="10" y1="3" x2="8" y2="21"></line>
                    <line x1="16" y1="3" x2="14" y2="21"></line>
                  </svg>
                  Subject
                </span>
              </div>
              <div class="value">${data.subject}</div>
            </div>
            <div class="field">
              <div class="label">
                <span class="label-inner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  Message
                </span>
              </div>
              <div class="message-box">${data.message.replace(/\n/g, '<br>')}</div>
            </div>
            <div class="actions">
              <a href="mailto:${data.email}?subject=Re: ${encodeURIComponent(data.subject)}" class="reply-btn">
                Reply to ${data.name}
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This notification was sent from your portfolio contact form.</p>
            <p>&copy; ${new Date().getFullYear()} Ganpat Singh &bull; Portfolio</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
New Contact Form Submission
===========================

From: ${data.name}
Email: ${data.email}
${data.phone ? `Phone: ${data.phone}` : ''}
Subject: ${data.subject}

Message:
${data.message}

---
Reply to this message by emailing ${data.email}
  `.trim();

  const mailOptions = {
      from: `"Portfolio Contact" <${fromEmail}>`,
      to: notificationEmail,
      replyTo: data.email,
      subject: `New Contact: ${data.subject}`,
      text: textContent,
      html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);

    console.log(`✅ Email notification sent for contact from ${data.email}`);
    return true;
  } catch (error: any) {
    if (error?.code === 'ETIMEDOUT' && error?.command === 'CONN' && smtpHost?.includes('gmail.com') && smtpPort !== 465) {
      console.warn('⚠️ SMTP connection timeout on primary Gmail transport. Retrying with SSL port 465...');
      try {
        const fallbackTransporter = nodemailer.createTransport({
          host: smtpHost,
          port: 465,
          secure: true,
          connectionTimeout: 15000,
          greetingTimeout: 10000,
          socketTimeout: 20000,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
        await fallbackTransporter.sendMail(mailOptions);
        console.log(`✅ Email notification sent via Gmail SSL fallback for ${data.email}`);
        return true;
      } catch (fallbackError: any) {
        console.error('❌ Gmail SSL fallback also failed:', fallbackError);
      }
    }

    if (error?.code === 'ETIMEDOUT' && error?.command === 'CONN') {
      console.error(`❌ SMTP connection timeout to ${smtpHost}:${smtpPort} (secure=${smtpSecure}).`);
      console.error('   This is usually an outbound network restriction from the hosting provider to SMTP endpoints.');
    }

    if (error?.code === 'EAUTH' || error?.responseCode === 535) {
      emailAuthFailed = true;
      console.error('❌ SMTP authentication failed (EAUTH/535).');
      console.error('   Verify SMTP_USER and SMTP_PASS. For Gmail, use a 16-character App Password (not your normal account password).');
      return false;
    }

    console.error('❌ Failed to send email notification:', error);
    return false;
  }
}

/**
 * Test email configuration
 */
export async function testEmailConfig(): Promise<{ success: boolean; message: string }> {
  if (!transporter) {
    return { 
      success: false, 
      message: 'Email transporter not configured. Check SMTP_HOST/SMTP_USER/SMTP_PASS (or EMAIL_HOST/EMAIL_USER/EMAIL_PASS).'
    };
  }

  try {
    await transporter.verify();
    return { success: true, message: 'Email configuration is valid' };
  } catch (error: any) {
    return { success: false, message: `Email configuration error: ${error.message}` };
  }
}

export default { sendContactNotification, testEmailConfig };
