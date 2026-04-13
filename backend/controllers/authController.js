import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { requestOTP, verifyOTP } from '../services/otpService.js';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

export const getGoogleConfig = (req, res) => {
    res.json({ clientId: process.env.GOOGLE_CLIENT_ID || '' });
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Register user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    const db = req.db;

    try {
        const userExists = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        // Generate backup codes upon registration
        const backupCodes = Array.from({ length: 5 }, () => crypto.randomBytes(4).toString('hex')).join(',');

        const result = await db.run(
            'INSERT INTO users (name, email, password, backup_codes) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, backupCodes]
        );

        const newUser = await db.get('SELECT id, name, email, role FROM users WHERE id = ?', [result.lastID]);
        const userData = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role };
        res.status(201).json({
            ...userData,
            user: userData,
            data: { user: userData },
            token: generateToken(newUser.id, newUser.role)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    const db = req.db;

    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ message: 'Login failed: Account not found' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Login failed: Incorrect access key' });
        }

        // Check if 2FA is enabled
        if (user.two_factor_enabled) {
            await requestOTP(db, email, 'Login Verification');
            return res.json({
                twoFactorRequired: true,
                email: user.email,
                message: '2-Step Verification required. OTP sent to email.'
            });
        }

        const userData = { 
            id: user.id, 
            name: user.name, 
            email: user.email, 
            role: user.role,
            isAdmin: user.role === 'admin'
        };
        res.json({
            ...userData,
            user: userData,
            data: { user: userData },
            token: generateToken(user.id, user.role)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Google login
// @route   POST /api/auth/google
export const googleLogin = async (req, res) => {
    const { token } = req.body;
    const db = req.db;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const { sub: google_id, email, name, picture } = ticket.getPayload();

        let user = await db.get('SELECT * FROM users WHERE google_id = ? OR email = ?', [google_id, email]);

        if (!user) {
            const backupCodes = Array.from({ length: 5 }, () => crypto.randomBytes(4).toString('hex')).join(',');
            const result = await db.run(
                'INSERT INTO users (name, email, google_id, backup_codes) VALUES (?, ?, ?, ?)',
                [name, email, google_id, backupCodes]
            );
            user = await db.get('SELECT * FROM users WHERE id = ?', [result.lastID]);
        } else if (!user.google_id) {
            await db.run('UPDATE users SET google_id = ? WHERE id = ?', [google_id, user.id]);
            user.google_id = google_id;
        }

        // Google login also respects 2-Step
        if (user.two_factor_enabled) {
            await requestOTP(db, email, 'Google Login Verification');
            return res.json({
                twoFactorRequired: true,
                email: user.email,
                message: '2-Step Verification required. OTP sent to email.'
            });
        }

        const userData = { 
            id: user.id, 
            name: user.name, 
            email: user.email, 
            role: user.role,
            isAdmin: user.role === 'admin'
        };
        res.json({
            ...userData,
            user: userData,
            data: { user: userData },
            token: generateToken(user.id, user.role)
        });
    } catch (error) {
        res.status(500).json({ message: 'Google Auth Error: ' + error.message });
    }
};

// @desc    Verify 2-Step and login
// @route   POST /api/auth/otp/verify-2step
export const verifyTwoStep = async (req, res) => {
    const { email, otp, backupCode } = req.body;
    const db = req.db;

    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (backupCode) {
            const codes = (user.backup_codes || "").split(',');
            if (codes.includes(backupCode)) {
                // Remove used backup code
                const newCodes = codes.filter(c => c !== backupCode).join(',');
                await db.run('UPDATE users SET backup_codes = ? WHERE id = ?', [newCodes, user.id]);
            } else {
                return res.status(400).json({ message: 'Invalid backup code' });
            }
        } else {
            const verification = await verifyOTP(db, email, otp);
            if (!verification.success) return res.status(400).json(verification);
        }

        const userData = { 
            id: user.id, 
            name: user.name, 
            email: user.email, 
            role: user.role,
            isAdmin: user.role === 'admin'
        };
        res.json({
            ...userData,
            user: userData,
            data: { user: userData },
            token: generateToken(user.id, user.role)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    const db = req.db;

    try {
        const user = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (!user) return res.status(404).json({ message: 'No account found with this email.' });

        await requestOTP(db, email, 'Password Reset');
        res.json({ success: true, message: 'Password reset OTP sent to email.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    const db = req.db;

    try {
        const verification = await verifyOTP(db, email, otp);
        if (!verification.success) return res.status(400).json(verification);

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);

        res.json({ success: true, message: 'Password reset successful. You can now login.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
    const db = req.db;
    try {
        const user = await db.get('SELECT id, name, email, role, avatar, created_at, two_factor_enabled FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            created_at: user.created_at,
            two_factor_enabled: !!user.two_factor_enabled
        };

        const employee = await db.get('SELECT * FROM employees WHERE user_id = ?', [user.id]);
        if (employee) {
            userData.employee_profile = {
                ...employee,
                skills: employee.skills ? JSON.parse(employee.skills) : [],
                social_links: employee.social_links ? JSON.parse(employee.social_links) : {}
            };
        }

        res.json({
            ...userData,
            user: userData,
            data: { user: userData }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate new backup codes for 2FA
// @route   POST /api/auth/backup-codes
export const generateBackupCodes = async (req, res) => {
    const db = req.db;
    try {
        const newCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));
        const codesString = newCodes.join(',');
        await db.run('UPDATE users SET backup_codes = ? WHERE id = ?', [codesString, req.user.id]);
        res.json({ success: true, backupCodes: newCodes, message: 'New backup codes generated. Save these in a safe place.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users
export const getAllUsers = async (req, res) => {
    const db = req.db;
    try {
        const users = await db.all('SELECT id, name, email, role, avatar, created_at FROM users');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a user
// @route   DELETE /api/users/:id
export const deleteUser = async (req, res) => {
    const db = req.db;
    try {
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ message: 'You cannot delete your own admin account.' });
        }
        await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a user's role
// @route   PUT /api/users/:id/role
export const updateUserRole = async (req, res) => {
    const db = req.db;
    const { role } = req.body;
    const allowedRoles = ['user', 'admin', 'superadmin', 'product_manager', 'content_manager', 'support_agent'];
    if (!role || !allowedRoles.includes(role)) {
        return res.status(400).json({ message: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` });
    }
    try {
        const user = await db.get('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ message: 'User not found' });
        await db.run('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [role, req.params.id]);
        res.json({ message: 'User role updated successfully', role });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};