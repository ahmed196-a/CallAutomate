const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// Load .env.local dynamically if not already loaded into environment
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq !== -1) {
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  });
}

async function testEmail() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.CONTACT_TO_EMAIL || user;

  if (!host || !user || !pass || !to) {
    console.error('[SMTP TEST] Error: Missing SMTP_HOST, SMTP_USER, or SMTP_PASS in .env.local.');
    process.exit(1);
  }

  console.log(`[SMTP TEST] Connecting to ${host}:${port} as ${user}...`);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    }
  });

  // Verify connection configuration
  try {
    await transporter.verify();
    console.log('[SMTP TEST] Connection verified successfully!');
  } catch (err) {
    console.error('[SMTP TEST] Verification failed:', err);
    process.exit(1);
  }

  // Sample submission data
  const sampleData = {
    name: 'Sam Taylor',
    restaurant: "Tony's Pizzeria",
    contact: '+1 555-234-5678 / sam@tonyspizza.com',
    interestedIn: 'Voice agent, WhatsApp chatbot, AI ordering website',
    pos: 'Toast POS',
    slot: 'Tomorrow, Oct 13 at 2:30 PM',
    tz: 'EDT (GMT-4)',
    notes: 'We have 2 locations and want to automate our busy dinner phone calls.',
    date: new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
  };

  const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
  const attachments = [];
  let logoHtml = `<div style="font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">CallAutomate<span style="color:#38bdf8;">.ai</span></div>`;

  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: 'logo.png',
      path: logoPath,
      cid: 'callautomate-logo'
    });
    logoHtml = `
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="middle" style="padding-right:12px;">
            <img src="cid:callautomate-logo" alt="CallAutomate" width="46" height="46" style="border-radius:12px;display:block;" />
          </td>
          <td valign="middle">
            <span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              CallAutomate<span style="color:#38bdf8;">.ai</span>
            </span>
          </td>
        </tr>
      </table>
    `;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>New Demo Request</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0b0e1a;padding:40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.45);border:1px solid #1e293b;">
          
          <!-- Gradient Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#070c1e 0%,#0d1a40 45%,#1d4ed8 100%);padding:36px 36px 30px;color:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>${logoHtml}</td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;padding:6px 14px;border-radius:999px;background:rgba(56,189,248,0.18);border:1px solid rgba(56,189,248,0.4);color:#38bdf8;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">
                      New Lead
                    </span>
                  </td>
                </tr>
              </table>
              
              <div style="margin-top:24px;">
                <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;line-height:1.2;">
                  New Restaurant Demo Request
                </h1>
                <p style="margin:0;font-size:15px;color:#cbd5e1;line-height:1.4;">
                  A restaurant owner just completed the interactive booking form on your website.
                </p>
              </div>
            </td>
          </tr>

          <!-- Summary Highlights -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 36px;border-bottom:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="50%" valign="top">
                    <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Restaurant</span>
                    <div style="font-size:18px;font-weight:700;color:#0b0e1a;margin-top:3px;">${sampleData.restaurant}</div>
                  </td>
                  <td width="50%" valign="top">
                    <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Requested Slot</span>
                    <div style="font-size:16px;font-weight:600;color:#2563eb;margin-top:3px;">${sampleData.slot}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Full Details Section -->
          <tr>
            <td style="padding:32px 36px;">
              <h2 style="margin:0 0 20px;font-size:16px;font-weight:700;color:#0b0e1a;letter-spacing:-0.2px;text-transform:uppercase;font-size:13px;color:#64748b;">
                Customer Information
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0 12px;">
                <!-- Name -->
                <tr>
                  <td width="36%" style="padding:10px 14px;background:#f8fafc;border-radius:10px 0 0 10px;font-size:13.5px;font-weight:600;color:#475569;">
                    Contact Name:
                  </td>
                  <td width="64%" style="padding:10px 14px;background:#f8fafc;border-radius:0 10px 10px 0;font-size:14.5px;font-weight:600;color:#0b0e1a;">
                    ${sampleData.name}
                  </td>
                </tr>

                <!-- Contact Details -->
                <tr>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:10px 0 0 10px;font-size:13.5px;font-weight:600;color:#475569;">
                    Phone / Email:
                  </td>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:0 10px 10px 0;font-size:14.5px;font-weight:600;color:#0b0e1a;">
                    <a href="mailto:${sampleData.contact}" style="color:#2563eb;text-decoration:none;">${sampleData.contact}</a>
                  </td>
                </tr>

                <!-- POS System -->
                <tr>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:10px 0 0 10px;font-size:13.5px;font-weight:600;color:#475569;">
                    POS System:
                  </td>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:0 10px 10px 0;font-size:14.5px;font-weight:600;color:#0b0e1a;">
                    ${sampleData.pos}
                  </td>
                </tr>

                <!-- Interested In -->
                <tr>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:10px 0 0 10px;font-size:13.5px;font-weight:600;color:#475569;">
                    Interested In:
                  </td>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:0 10px 10px 0;font-size:14px;font-weight:600;color:#1e40af;">
                    ${sampleData.interestedIn}
                  </td>
                </tr>

                <!-- Timezone -->
                <tr>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:10px 0 0 10px;font-size:13.5px;font-weight:600;color:#475569;">
                    Timezone:
                  </td>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:0 10px 10px 0;font-size:14px;font-weight:500;color:#334155;">
                    ${sampleData.tz}
                  </td>
                </tr>

                <!-- Submission Time -->
                <tr>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:10px 0 0 10px;font-size:13.5px;font-weight:600;color:#475569;">
                    Submitted At:
                  </td>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:0 10px 10px 0;font-size:13.5px;font-weight:500;color:#64748b;">
                    ${sampleData.date}
                  </td>
                </tr>
              </table>

              <!-- Notes Box -->
              ${
                sampleData.notes
                  ? `
              <div style="margin-top:20px;padding:16px 20px;background:#eff6ff;border-left:4px solid #2563eb;border-radius:0 12px 12px 0;">
                <div style="font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
                  Additional Notes from Restaurant
                </div>
                <div style="font-size:14px;color:#1e293b;line-height:1.5;">
                  ${sampleData.notes}
                </div>
              </div>`
                  : ''
              }

              <!-- Direct Action Button -->
              <div style="margin-top:30px;text-align:center;">
                <a href="mailto:${sampleData.contact}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:999px;box-shadow:0 8px 20px -4px rgba(37,99,235,0.5);">
                  Reply Directly to Lead
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0b0e1a;padding:26px 36px;text-align:center;color:#94a3b8;font-size:12.5px;line-height:1.6;border-top:1px solid #1e293b;">
              <div style="color:#ffffff;font-weight:600;margin-bottom:4px;">CallAutomate AI Restaurants</div>
              <div>Automated Voice &amp; Chat Ordering System</div>
              <div style="margin-top:10px;color:#64748b;font-size:11.5px;">
                This email was generated automatically by the contact form at <a href="https://callautomate.ai" style="color:#38bdf8;text-decoration:none;">callautomate.ai</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  console.log(`[SMTP TEST] Sending test email to ${to}...`);

  const info = await transporter.sendMail({
    from: `"CallAutomate AI" <${user}>`,
    to: to,
    replyTo: sampleData.contact.includes('@') ? sampleData.contact : user,
    subject: `🔔 New Demo Request: ${sampleData.restaurant} (${sampleData.name})`,
    html: html,
    attachments: attachments
  });

  console.log('[SMTP TEST] Email successfully sent!');
  console.log('[SMTP TEST] Message ID:', info.messageId);
  console.log('[SMTP TEST] Response:', info.response);
}

testEmail().catch(err => {
  console.error('[SMTP TEST] Error occurred:', err);
  process.exit(1);
});
