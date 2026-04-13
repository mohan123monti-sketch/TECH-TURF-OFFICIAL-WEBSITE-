import express from 'express';
import {
    registerUser, loginUser, googleLogin, verifyTwoStep,
    forgotPassword, resetPassword, generateBackupCodes, getMe, getGoogleConfig,
    getAllUsers, deleteUser, updateUserRole
} from '../controllers/authController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/google/config', getGoogleConfig);
router.post('/google', googleLogin);
router.post('/otp/verify-2step', verifyTwoStep);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/backup-codes', protect, generateBackupCodes);
router.get('/me', protect, getMe);
router.get('/profile', protect, getMe);

// Admin Routes
router.get('/', protect, adminOnly, getAllUsers);
router.delete('/:id', protect, adminOnly, deleteUser);
router.put('/:id/role', protect, adminOnly, updateUserRole);

export default router;
