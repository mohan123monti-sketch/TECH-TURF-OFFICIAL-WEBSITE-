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

const buildSafeName = (name, email) => {
    const cleanName = (name || '').trim();
    if (cleanName) return cleanName;

    const localPart = String(email || '').split('@')[0].trim();
    if (localPart) return localPart;

    return 'User';
};

const toNullIfEmpty = (value) => {
    const trimmed = typeof value === 'string' ? value.trim() : value;
    return trimmed ? trimmed : null;
};

const selectPrimaryAddress = async (db, userId) => {
    return db.get(
        'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY isDefault DESC, created_at DESC LIMIT 1',
        [userId]
    );
};

const selectPrimaryPayment = async (db, userId) => {
    return db.get(
        'SELECT * FROM user_payment_details WHERE user_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1',
        [userId]
    );
};

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Register user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    const db = req.db;
    const safeName = buildSafeName(name, email);
    const safeUsername = buildSafeName(name, email).toLowerCase().replace(/\s+/g, '.');

    try {
        const userExists = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        // Generate backup codes upon registration
        const backupCodes = Array.from({ length: 5 }, () => crypto.randomBytes(4).toString('hex')).join(',');

        const result = await db.run(
            'INSERT INTO users (name, username, email, password, backup_codes) VALUES (?, ?, ?, ?, ?)',
            [safeName, safeUsername, email, hashedPassword, backupCodes]
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
            isAdmin: ['admin', 'superadmin'].includes(user.role)
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
        const safeName = buildSafeName(name, email);
        const safeUsername = buildSafeName(name, email).toLowerCase().replace(/\s+/g, '.');

        let user = await db.get('SELECT * FROM users WHERE google_id = ? OR email = ?', [google_id, email]);

        if (!user) {
            const backupCodes = Array.from({ length: 5 }, () => crypto.randomBytes(4).toString('hex')).join(',');
            const result = await db.run(
                'INSERT INTO users (name, username, email, google_id, backup_codes) VALUES (?, ?, ?, ?, ?)',
                [safeName, safeUsername, email, google_id, backupCodes]
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
            isAdmin: ['admin', 'superadmin'].includes(user.role)
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
            isAdmin: ['admin', 'superadmin'].includes(user.role)
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

// @desc    Get current user profile (frontend compatibility)
// @route   GET /api/users/profile
export const getUserProfile = async (req, res) => {
    const db = req.db;
    try {
        const user = await db.get('SELECT id, name, username, email, role, avatar, phone, company_name, created_at FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const address = await selectPrimaryAddress(db, user.id);
        const payment = await selectPrimaryPayment(db, user.id);

        res.json({
            _id: String(user.id),
            id: user.id,
            fullName: user.name,
            name: user.name,
            username: user.username || user.name,
            accountUsername: user.username,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            phone: user.phone,
            companyName: user.company_name,
            createdAt: user.created_at,
            created_at: user.created_at,
            address: address ? {
                _id: String(address.id),
                id: address.id,
                label: address.label,
                addressLine1: address.address,
                addressLine2: address.addressLine2,
                address: address.address,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                country: address.country,
                phone: address.phone,
                company: address.company,
                gstin: address.gstin,
                isDefault: !!address.isDefault
            } : null,
            payment: payment ? {
                _id: String(payment.id),
                id: payment.id,
                paymentMethod: payment.paymentMethod,
                billingName: payment.billingName,
                billingAddressLine1: payment.billingAddress1,
                billingAddressLine2: payment.billingAddress2,
                billingAddress: payment.billingAddress1,
                billingCity: payment.billingCity,
                billingState: payment.billingState,
                billingPincode: payment.billingPincode,
                billingCountry: payment.billingCountry
            } : null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update current user profile
// @route   PUT /api/users/profile
export const updateUserProfile = async (req, res) => {
    const db = req.db;
    try {
        const {
            fullName,
            name,
            username,
            avatar,
            bio,
            phone,
            companyName,
            password,
            confirmPassword,
            addressLine1,
            addressLine2,
            city,
            state,
            pincode,
            country,
            paymentMethod,
            billingName,
            billingAddressLine1,
            billingAddressLine2,
            billingCity,
            billingState,
            billingPincode,
            billingCountry
        } = req.body || {};

        const nextName = buildSafeName(fullName || name || username, req.user.email);
        const nextUsername = toNullIfEmpty(username);
        const nextPhone = toNullIfEmpty(phone);
        const nextCompanyName = toNullIfEmpty(companyName);

        if ((password || confirmPassword) && password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.run(
                'UPDATE users SET name = ?, username = ?, avatar = COALESCE(?, avatar), bio = COALESCE(?, bio), phone = ?, company_name = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [nextName, nextUsername, avatar || null, bio || null, nextPhone, nextCompanyName, hashedPassword, req.user.id]
            );
        } else {
            await db.run(
                'UPDATE users SET name = ?, username = ?, avatar = COALESCE(?, avatar), bio = COALESCE(?, bio), phone = ?, company_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [nextName, nextUsername, avatar || null, bio || null, nextPhone, nextCompanyName, req.user.id]
            );
        }

        const addressProvided = [addressLine1, city, state, pincode, country, addressLine2].some((value) => String(value || '').trim());
        if (addressProvided) {
            const existingAddress = await db.get(
                'SELECT id FROM user_addresses WHERE user_id = ? ORDER BY isDefault DESC, created_at DESC LIMIT 1',
                [req.user.id]
            );
            const normalizedAddressLine1 = toNullIfEmpty(addressLine1);
            const normalizedCity = toNullIfEmpty(city);
            const normalizedState = toNullIfEmpty(state);
            const normalizedPincode = toNullIfEmpty(pincode);
            const normalizedCountry = toNullIfEmpty(country) || 'India';
            const normalizedAddressLine2 = toNullIfEmpty(addressLine2);

            if (!normalizedAddressLine1 || !normalizedCity || !normalizedState || !normalizedPincode) {
                return res.status(400).json({ message: 'Address line 1, city, state, and pincode are required' });
            }

            if (existingAddress) {
                await db.run(
                    `UPDATE user_addresses
                     SET label = ?, address = ?, addressLine2 = ?, city = ?, state = ?, postalCode = ?, country = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ? AND user_id = ?`,
                    ['Primary', normalizedAddressLine1, normalizedAddressLine2, normalizedCity, normalizedState, normalizedPincode, normalizedCountry, existingAddress.id, req.user.id]
                );
            } else {
                await db.run(
                    `INSERT INTO user_addresses (
                        user_id, label, address, addressLine2, city, state, postalCode, country, isDefault
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                    [req.user.id, 'Primary', normalizedAddressLine1, normalizedAddressLine2, normalizedCity, normalizedState, normalizedPincode, normalizedCountry]
                );
            }
        }

        const paymentProvided = [paymentMethod, billingName, billingAddressLine1, billingCity, billingState, billingPincode, billingCountry, billingAddressLine2].some((value) => String(value || '').trim());
        if (paymentProvided) {
            const existingPayment = await db.get(
                'SELECT id FROM user_payment_details WHERE user_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1',
                [req.user.id]
            );

            const normalizedPaymentMethod = toNullIfEmpty(paymentMethod) || 'COD';
            const normalizedBillingName = toNullIfEmpty(billingName) || nextName;
            const normalizedBillingAddress1 = toNullIfEmpty(billingAddressLine1);
            const normalizedBillingAddress2 = toNullIfEmpty(billingAddressLine2);
            const normalizedBillingCity = toNullIfEmpty(billingCity);
            const normalizedBillingState = toNullIfEmpty(billingState);
            const normalizedBillingPincode = toNullIfEmpty(billingPincode);
            const normalizedBillingCountry = toNullIfEmpty(billingCountry) || 'India';

            if (existingPayment) {
                await db.run(
                    `UPDATE user_payment_details
                     SET paymentMethod = ?, billingName = ?, billingAddress1 = ?, billingAddress2 = ?, billingCity = ?, billingState = ?, billingPincode = ?, billingCountry = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ? AND user_id = ?`,
                    [normalizedPaymentMethod, normalizedBillingName, normalizedBillingAddress1, normalizedBillingAddress2, normalizedBillingCity, normalizedBillingState, normalizedBillingPincode, normalizedBillingCountry, existingPayment.id, req.user.id]
                );
            } else {
                await db.run(
                    `INSERT INTO user_payment_details (
                        user_id, paymentMethod, billingName, billingAddress1, billingAddress2, billingCity, billingState, billingPincode, billingCountry
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [req.user.id, normalizedPaymentMethod, normalizedBillingName, normalizedBillingAddress1, normalizedBillingAddress2, normalizedBillingCity, normalizedBillingState, normalizedBillingPincode, normalizedBillingCountry]
                );
            }
        }

        const updated = await db.get('SELECT id, name, username, email, role, avatar, bio, phone, company_name, created_at FROM users WHERE id = ?', [req.user.id]);
        const savedAddress = await selectPrimaryAddress(db, req.user.id);
        const savedPayment = await selectPrimaryPayment(db, req.user.id);
        res.json({
            _id: String(updated.id),
            id: updated.id,
            fullName: updated.name,
            username: updated.username || updated.name,
            name: updated.name,
            email: updated.email,
            role: updated.role,
            avatar: updated.avatar,
            bio: updated.bio,
            phone: updated.phone,
            companyName: updated.company_name,
            createdAt: updated.created_at,
            created_at: updated.created_at,
            address: savedAddress ? {
                _id: String(savedAddress.id),
                id: savedAddress.id,
                label: savedAddress.label,
                addressLine1: savedAddress.address,
                addressLine2: savedAddress.addressLine2,
                address: savedAddress.address,
                city: savedAddress.city,
                state: savedAddress.state,
                postalCode: savedAddress.postalCode,
                country: savedAddress.country,
                phone: savedAddress.phone,
                company: savedAddress.company,
                gstin: savedAddress.gstin,
                isDefault: !!savedAddress.isDefault
            } : null,
            payment: savedPayment ? {
                _id: String(savedPayment.id),
                id: savedPayment.id,
                paymentMethod: savedPayment.paymentMethod,
                billingName: savedPayment.billingName,
                billingAddressLine1: savedPayment.billingAddress1,
                billingAddressLine2: savedPayment.billingAddress2,
                billingAddress: savedPayment.billingAddress1,
                billingCity: savedPayment.billingCity,
                billingState: savedPayment.billingState,
                billingPincode: savedPayment.billingPincode,
                billingCountry: savedPayment.billingCountry
            } : null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get saved user addresses
// @route   GET /api/users/addresses
export const getUserAddresses = async (req, res) => {
    const db = req.db;
    try {
        const rows = await db.all(
            'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY isDefault DESC, created_at DESC',
            [req.user.id]
        );

        const addresses = rows.map((a) => ({
            _id: String(a.id),
            id: a.id,
            label: a.label,
            address: a.address,
            addressLine1: a.address,
            addressLine2: a.addressLine2,
            city: a.city,
            state: a.state,
            postalCode: a.postalCode,
            country: a.country,
            phone: a.phone,
            company: a.company,
            gstin: a.gstin,
            isDefault: !!a.isDefault,
            createdAt: a.created_at,
            updatedAt: a.updated_at
        }));

        res.json({ addresses });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Save a user address
// @route   POST /api/users/addresses
export const addUserAddress = async (req, res) => {
    const db = req.db;
    try {
        const {
            label = 'Saved',
            address = '',
            addressLine1 = '',
            addressLine2 = '',
            city = '',
            state = '',
            postalCode = '',
            country = 'India',
            phone = '',
            company = '',
            gstin = '',
            isDefault = false
        } = req.body || {};

        const normalizedAddress = (addressLine1 || address || '').trim();
        if (!normalizedAddress || !city || !state || !postalCode) {
            return res.status(400).json({ message: 'address, city, state, and postalCode are required' });
        }

        if (isDefault) {
            await db.run('UPDATE user_addresses SET isDefault = 0 WHERE user_id = ?', [req.user.id]);
        }

        const result = await db.run(
            `INSERT INTO user_addresses (
                user_id, label, address, addressLine2, city, state, postalCode, country, phone, company, gstin, isDefault
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, label, normalizedAddress, toNullIfEmpty(addressLine2), city, state, postalCode, country, phone, company, gstin, isDefault ? 1 : 0]
        );

        const row = await db.get('SELECT * FROM user_addresses WHERE id = ?', [result.lastID]);
        res.status(201).json({
            _id: String(row.id),
            id: row.id,
            label: row.label,
            address: row.address,
            addressLine1: row.address,
            addressLine2: row.addressLine2,
            city: row.city,
            state: row.state,
            postalCode: row.postalCode,
            country: row.country,
            phone: row.phone,
            company: row.company,
            gstin: row.gstin,
            isDefault: !!row.isDefault,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get public team members for website About page
// @route   GET /api/auth/team
export const getPublicTeam = async (req, res) => {
    const db = req.db;
    try {
        const team = await db.all(
            `SELECT id, name, role, avatar, created_at
             FROM users
             WHERE role != 'user'
             ORDER BY
                CASE role
                    WHEN 'superadmin' THEN 1
                    WHEN 'admin' THEN 2
                    WHEN 'content_manager' THEN 3
                    WHEN 'product_manager' THEN 4
                    WHEN 'support_agent' THEN 5
                    ELSE 6
                END,
                created_at ASC
             LIMIT 9`
        );

        res.json(team);
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