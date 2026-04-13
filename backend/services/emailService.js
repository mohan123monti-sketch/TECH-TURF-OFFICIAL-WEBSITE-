import transporter from '../config/mailer.js';
import dotenv from 'dotenv';
dotenv.config();

export const sendEmail = async (to, subject, text, html) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

export const sendOTPEmail = async (email, otp, type = 'Verification') => {
    const subject = `${type} Code - Tech Turf Central Hub`;
    const text = `Your security code is: ${otp}. It will expire in 10 minutes.`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #0d1117; color: #ffffff;">
            <div style="text-align: center; border-bottom: 1px solid #30363d; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="color: #22d3ee; margin: 0;">TECH TURF</h2>
                <small style="color: #8b949e; letter-spacing: 2px;">AUTHENTICATION SERVICES</small>
            </div>
            <p style="font-size: 16px;">Hello,</p>
            <p style="font-size: 14px; color: #c9d1d9;">You requested a ${type.toLowerCase()} for your account. Please use the secure code below:</p>
            <div style="text-align: center; padding: 20px; margin: 20px 0; background-color: #161b22; border-radius: 8px; border: 1px solid #30363d;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #22d3ee;">${otp}</span>
            </div>
            <p style="font-size: 12px; color: #8b949e;">This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
            <p style="font-size: 14px; margin-top: 30px; border-top: 1px solid #30363d; padding-top: 20px; color: #8b949e; text-align: center;">
                &copy; 2026 Tech Turf Collective. All Rights Reserved.
            </p>
        </div>
    `;
    return sendEmail(email, subject, text, html);
};
