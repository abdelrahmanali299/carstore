const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

// ── Generate 6-digit OTP ──
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ── OTP expiry: 10 minutes ──
const getOTPExpiry = () => {
  return new Date(Date.now() + 10 * 60 * 1000);
};

// ── Send OTP via SMS ──
const sendOTPSms = async (phone, otp, type) => {
  const messages = {
    email_verification: `🚗 CarStore: Your verification code is ${otp}. Valid for 10 minutes. Do not share this code.`,
    password_reset: `🚗 CarStore: Your password reset code is ${otp}. Valid for 10 minutes. If you didn't request this, ignore this message.`,
  };

  await client.messages.create({
    body: messages[type] || `🚗 CarStore: Your OTP is ${otp}. Valid for 10 minutes.`,
    from: TWILIO_PHONE,
    to: phone,
  });
};

module.exports = { generateOTP, getOTPExpiry, sendOTPSms };
