import { generateOTP } from '../utils/generateOTP.js';
import { sendOTPEmail } from './emailService.js';

export const requestOTP = async (db, email, type = 'Verification') => {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    try {
        // Save to DB (overwrite existing for same email)
        await db.run('DELETE FROM otp_codes WHERE email = ?', [email]);
        await db.run('INSERT INTO otp_codes (email, otp, expires_at) VALUES (?, ?, ?)', [email, otp, expiresAt]);

        // Send email
        await sendOTPEmail(email, otp, type);
        return { success: true, message: 'OTP sent to email.' };
    } catch (error) {
        console.error('OTP Request Error:', error);
        throw error;
    }
};

export const verifyOTP = async (db, email, otp) => {
    try {
        const record = await db.get('SELECT * FROM otp_codes WHERE email = ? AND otp = ?', [email, otp]);

        if (!record) return { success: false, message: 'Invalid OTP.' };

        const currentTime = new Date().toISOString();
        if (record.expires_at < currentTime) {
            await db.run('DELETE FROM otp_codes WHERE email = ?', [email]);
            return { success: false, message: 'OTP expired.' };
        }

        // Clean up
        await db.run('DELETE FROM otp_codes WHERE email = ?', [email]);
        return { success: true };
    } catch (error) {
        console.error('OTP Verification Error:', error);
        throw error;
    }
};
