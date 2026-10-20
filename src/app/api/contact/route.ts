import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name = '',
      restaurant = '',
      contact = '',
      interestedIn = '',
      pos = '',
      slot = '',
      tz = '',
      notes = ''
    } = body;

    // Validate minimum requirements
    if (!name && !contact && !restaurant) {
      return NextResponse.json(
        { success: false, error: 'Please provide at least a name, restaurant, or contact method.' },
        { status: 400 }
      );
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const to = process.env.CONTACT_TO_EMAIL || user;

    if (!host || !user || !pass || !to) {
      console.error('SMTP configuration missing: check SMTP_HOST, SMTP_USER, SMTP_PASS in environment variables.');
      return NextResponse.json(
        { success: false, error: 'Email service configuration is missing.' },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });

    const logoFile = fs.existsSync(path.join(process.cwd(), 'public', 'logo-removebg-preview.png'))
      ? 'logo-removebg-preview.png'
      : 'logo.png';
    const logoPath = path.join(process.cwd(), 'public', logoFile);
    const attachments = [];
    let logoHtml = `<div style="font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">CallAutomate<span style="color:#38bdf8;">.ai</span></div>`;

    if (fs.existsSync(logoPath)) {
      attachments.push({
        filename: logoFile,
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

    const formattedDate = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const isEmailContact = contact.includes('@');
    const emailMatch = contact.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const replyToEmail = emailMatch ? emailMatch[0] : (isEmailContact ? contact.trim() : user);

    const htmlContent = `
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
        <!-- Main Card Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.45);border:1px solid #1e293b;">
          
          <!-- Gradient Brand Header -->
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
                  A restaurant owner submitted their information via the interactive booking form.
                </p>
              </div>
            </td>
          </tr>

          <!-- Summary Bar -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 36px;border-bottom:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="50%" valign="top">
                    <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Restaurant</span>
                    <div style="font-size:18px;font-weight:700;color:#0b0e1a;margin-top:3px;">
                      ${escapeHtml(restaurant || 'Not specified')}
                    </div>
                  </td>
                  <td width="50%" valign="top">
                    <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Requested Demo Slot</span>
                    <div style="font-size:16px;font-weight:600;color:#2563eb;margin-top:3px;">
                      ${escapeHtml(slot || 'Flexible / To be confirmed')}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Detailed Info Table -->
          <tr>
            <td style="padding:32px 36px;">
              <div style="margin:0 0 16px;font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
                Customer &amp; Setup Details
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0 10px;">
                <!-- Name -->
                <tr>
                  <td width="36%" style="padding:10px 14px;background:#f8fafc;border-radius:10px 0 0 10px;font-size:13.5px;font-weight:600;color:#475569;">
                    Contact Name:
                  </td>
                  <td width="64%" style="padding:10px 14px;background:#f8fafc;border-radius:0 10px 10px 0;font-size:14.5px;font-weight:600;color:#0b0e1a;">
                    ${escapeHtml(name || '—')}
                  </td>
                </tr>

                <!-- Restaurant Name -->
                <tr>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:10px 0 0 10px;font-size:13.5px;font-weight:600;color:#475569;">
                    Restaurant Name:
                  </td>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:0 10px 10px 0;font-size:14.5px;font-weight:600;color:#0b0e1a;">
                    ${escapeHtml(restaurant || '—')}
                  </td>
                </tr>

                <!-- Contact Info -->
                <tr>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:10px 0 0 10px;font-size:13.5px;font-weight:600;color:#475569;">
                    Phone / Email:
                  </td>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:0 10px 10px 0;font-size:14.5px;font-weight:600;color:#0b0e1a;">
                    ${
                      isEmailContact
                        ? `<a href="mailto:${escapeHtml(contact)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(contact)}</a>`
                        : escapeHtml(contact || '—')
                    }
                  </td>
                </tr>

                <!-- POS System -->
                <tr>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:10px 0 0 10px;font-size:13.5px;font-weight:600;color:#475569;">
                    POS System:
                  </td>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:0 10px 10px 0;font-size:14.5px;font-weight:600;color:#0b0e1a;">
                    ${escapeHtml(pos || 'Not specified')}
                  </td>
                </tr>

                <!-- Interested In -->
                <tr>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:10px 0 0 10px;font-size:13.5px;font-weight:600;color:#475569;">
                    Interested In:
                  </td>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:0 10px 10px 0;font-size:14px;font-weight:600;color:#1e40af;">
                    ${escapeHtml(interestedIn || 'General Demo')}
                  </td>
                </tr>

                <!-- Preferred Slot -->
                <tr>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:10px 0 0 10px;font-size:13.5px;font-weight:600;color:#475569;">
                    Preferred Demo Slot:
                  </td>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:0 10px 10px 0;font-size:14px;font-weight:600;color:#2563eb;">
                    ${escapeHtml(slot || 'Flexible')} ${tz ? `<span style="font-size:12.5px;font-weight:500;color:#64748b;">(${escapeHtml(tz)})</span>` : ''}
                  </td>
                </tr>

                <!-- Submission Timestamp -->
                <tr>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:10px 0 0 10px;font-size:13.5px;font-weight:600;color:#475569;">
                    Submitted On:
                  </td>
                  <td style="padding:10px 14px;background:#f8fafc;border-radius:0 10px 10px 0;font-size:13.5px;font-weight:500;color:#64748b;">
                    ${formattedDate}
                  </td>
                </tr>
              </table>

              <!-- Additional Notes -->
              ${
                notes
                  ? `
              <div style="margin-top:22px;padding:16px 20px;background:#eff6ff;border-left:4px solid #2563eb;border-radius:0 12px 12px 0;">
                <div style="font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
                  Additional Notes
                </div>
                <div style="font-size:14px;color:#1e293b;line-height:1.5;">
                  ${escapeHtml(notes)}
                </div>
              </div>`
                  : ''
              }

              <!-- Direct Reply Action -->
              ${
                isEmailContact
                  ? `
              <div style="margin-top:30px;text-align:center;">
                <a href="mailto:${escapeHtml(replyToEmail)}" style="display:inline-block;padding:14px 30px;background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:999px;box-shadow:0 8px 20px -4px rgba(37,99,235,0.5);">
                  Reply Directly to Lead
                </a>
              </div>`
                  : ''
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0b0e1a;padding:26px 36px;text-align:center;color:#94a3b8;font-size:12.5px;line-height:1.6;border-top:1px solid #1e293b;">
              <div style="color:#ffffff;font-weight:600;margin-bottom:4px;">CallAutomate AI Platform</div>
              <div>Automated Voice &amp; Chat Ordering System for Restaurants</div>
              <div style="margin-top:10px;color:#64748b;font-size:11.5px;">
                Direct inquiries to support@callautomate.ai &bull; +353-61-555-222
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

    const leadIdentifier = restaurant ? `${restaurant} (${name || 'Demo'})` : (name || 'New Lead');
    const mailOptions = {
      from: `"CallAutomate AI" <${user}>`,
      to: to,
      replyTo: replyToEmail,
      subject: `🔔 New Demo Request: ${leadIdentifier} — ${slot || '20-min demo'}`,
      html: htmlContent,
      attachments: attachments
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: 'Demo request email successfully sent.'
    });
  } catch (error: any) {
    console.error('Contact API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while sending email.' },
      { status: 500 }
    );
  }
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
