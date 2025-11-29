import nodemailer from 'nodemailer';
import logger from '../loaders/logger';
import env from '../config';

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});


export const sendVerificationEmail = async (email: string, token: string) => {
  const verificationUrl = `${env.SMTP_VERIFY_URL}/verify?token=${token}`;

  const mailOptions = {
    from: env.SMTP_USER || '"Support" <noreply@example.com>',
    to: email,
    subject: 'Verify your email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email address</h2>
        <p>Thanks for signing up! Please confirm your email address by clicking the link below:</p>
        <p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">
            Verify Email
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error('Error sending verification email:', error);
    return false;
  }
};
