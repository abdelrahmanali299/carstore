const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL; // your verified sender
const APP_NAME = 'CarStore';

// ── Generate 6-digit OTP ──
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ── OTP expiry: 10 minutes ──
const getOTPExpiry = () => {
  return new Date(Date.now() + 10 * 60 * 1000);
};

// ── Email Templates ──
const emailVerificationTemplate = (firstName, otp) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#FF6B00;padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:bold;">🚗 ${APP_NAME}</h1>
              <p style="color:#FFD4A8;margin:8px 0 0;font-size:14px;">Your Premium Car Marketplace</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1a1a1a;margin:0 0 16px;font-size:22px;">Verify Your Email</h2>
              <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Hi <strong>${firstName}</strong>, welcome to CarStore! Use the OTP below to verify your email address.
              </p>
              <!-- OTP Box -->
              <div style="background:#f8f8f8;border:2px dashed #FF6B00;border-radius:12px;padding:30px;text-align:center;margin:0 0 24px;">
                <p style="color:#888;font-size:13px;margin:0 0 12px;text-transform:uppercase;letter-spacing:2px;">Your verification code</p>
                <h1 style="color:#FF6B00;font-size:48px;font-weight:bold;margin:0;letter-spacing:12px;">${otp}</h1>
                <p style="color:#888;font-size:13px;margin:12px 0 0;">⏱ Expires in <strong>10 minutes</strong></p>
              </div>
              <p style="color:#888;font-size:13px;line-height:1.6;margin:0;">
                If you didn't create a CarStore account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8f8f8;padding:20px;text-align:center;border-top:1px solid #eee;">
              <p style="color:#aaa;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const resetPasswordTemplate = (firstName, otp) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#1a1a1a;padding:40px;text-align:center;">
              <h1 style="color:#FF6B00;margin:0;font-size:28px;font-weight:bold;">🚗 ${APP_NAME}</h1>
              <p style="color:#888;margin:8px 0 0;font-size:14px;">Password Reset Request</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1a1a1a;margin:0 0 16px;font-size:22px;">Reset Your Password</h2>
              <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Hi <strong>${firstName}</strong>, we received a request to reset your CarStore password. Use the OTP below to proceed.
              </p>
              <!-- OTP Box -->
              <div style="background:#1a1a1a;border-radius:12px;padding:30px;text-align:center;margin:0 0 24px;">
                <p style="color:#888;font-size:13px;margin:0 0 12px;text-transform:uppercase;letter-spacing:2px;">Password reset code</p>
                <h1 style="color:#FF6B00;font-size:48px;font-weight:bold;margin:0;letter-spacing:12px;">${otp}</h1>
                <p style="color:#888;font-size:13px;margin:12px 0 0;">⏱ Expires in <strong>10 minutes</strong></p>
              </div>
              <!-- Warning -->
              <div style="background:#FFF3E0;border-left:4px solid #FF6B00;padding:16px;border-radius:0 8px 8px 0;margin:0 0 24px;">
                <p style="color:#E65100;font-size:13px;margin:0;font-weight:bold;">⚠️ Security Notice</p>
                <p style="color:#555;font-size:13px;margin:8px 0 0;">If you didn't request a password reset, please secure your account immediately and ignore this email.</p>
              </div>
              <p style="color:#888;font-size:13px;">This code will expire in 10 minutes for your security.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8f8f8;padding:20px;text-align:center;border-top:1px solid #eee;">
              <p style="color:#aaa;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ── Send Email Verification OTP ──
const sendVerificationEmail = async (to, firstName, otp) => {
  const msg = {
    to,
    from: { email: FROM_EMAIL, name: APP_NAME },
    subject: `${otp} is your ${APP_NAME} verification code`,
    html: emailVerificationTemplate(firstName, otp),
  };
  await sgMail.send(msg);
};

// ── Send Password Reset OTP ──
const sendPasswordResetEmail = async (to, firstName, otp) => {
  const msg = {
    to,
    from: { email: FROM_EMAIL, name: APP_NAME },
    subject: `${otp} is your ${APP_NAME} password reset code`,
    html: resetPasswordTemplate(firstName, otp),
  };
  await sgMail.send(msg);
};

module.exports = {
  generateOTP,
  getOTPExpiry,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
