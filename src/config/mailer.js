const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // 16-char app password
  },
});

const APP_NAME = 'CarStore';

// ── Generate 6-digit OTP ──
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── OTP expiry: 10 minutes ──
const getOTPExpiry = () => new Date(Date.now() + 10 * 60 * 1000);

// ── Email Templates ──
const verificationTemplate = (firstName, otp) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="500" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:#FF6B00;padding:40px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:28px;">🚗 ${APP_NAME}</h1>
            <p style="color:#FFD4A8;margin:8px 0 0;font-size:14px;">Your Premium Car Marketplace</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#1a1a1a;margin:0 0 16px;">Verify Your Email</h2>
            <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Hi <strong>${firstName}</strong>, welcome to CarStore! Use the code below to verify your email.
            </p>
            <div style="background:#f8f8f8;border:2px dashed #FF6B00;border-radius:12px;padding:30px;text-align:center;margin:0 0 24px;">
              <p style="color:#888;font-size:13px;margin:0 0 12px;text-transform:uppercase;letter-spacing:2px;">Verification code</p>
              <h1 style="color:#FF6B00;font-size:48px;font-weight:bold;margin:0;letter-spacing:12px;">${otp}</h1>
              <p style="color:#888;font-size:13px;margin:12px 0 0;">⏱ Expires in <strong>10 minutes</strong></p>
            </div>
            <p style="color:#888;font-size:13px;">If you didn't create a CarStore account, ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f8f8;padding:20px;text-align:center;border-top:1px solid #eee;">
            <p style="color:#aaa;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const resetTemplate = (firstName, otp) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="500" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:#1a1a1a;padding:40px;text-align:center;">
            <h1 style="color:#FF6B00;margin:0;font-size:28px;">🚗 ${APP_NAME}</h1>
            <p style="color:#888;margin:8px 0 0;font-size:14px;">Password Reset Request</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#1a1a1a;margin:0 0 16px;">Reset Your Password</h2>
            <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Hi <strong>${firstName}</strong>, use the code below to reset your CarStore password.
            </p>
            <div style="background:#1a1a1a;border-radius:12px;padding:30px;text-align:center;margin:0 0 24px;">
              <p style="color:#888;font-size:13px;margin:0 0 12px;text-transform:uppercase;letter-spacing:2px;">Reset code</p>
              <h1 style="color:#FF6B00;font-size:48px;font-weight:bold;margin:0;letter-spacing:12px;">${otp}</h1>
              <p style="color:#888;font-size:13px;margin:12px 0 0;">⏱ Expires in <strong>10 minutes</strong></p>
            </div>
            <div style="background:#FFF3E0;border-left:4px solid #FF6B00;padding:16px;border-radius:0 8px 8px 0;margin:0 0 24px;">
              <p style="color:#E65100;font-size:13px;margin:0;font-weight:bold;">⚠️ Security Notice</p>
              <p style="color:#555;font-size:13px;margin:8px 0 0;">If you didn't request this, please ignore this email.</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f8f8;padding:20px;text-align:center;border-top:1px solid #eee;">
            <p style="color:#aaa;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ── Send Verification Email ──
const sendVerificationEmail = async (to, firstName, otp) => {
  await transporter.sendMail({
    from: `${APP_NAME} <${process.env.GMAIL_USER}>`,
    to,
    subject: `${otp} is your CarStore verification code`,
    html: verificationTemplate(firstName, otp),
  });
};

// ── Send Password Reset Email ──
const sendPasswordResetEmail = async (to, firstName, otp) => {
  await transporter.sendMail({
    from: `${APP_NAME} <${process.env.GMAIL_USER}>`,
    to,
    subject: `${otp} is your CarStore password reset code`,
    html: resetTemplate(firstName, otp),
  });
};

module.exports = {
  generateOTP,
  getOTPExpiry,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
