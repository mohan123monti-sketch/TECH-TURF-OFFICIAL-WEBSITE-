import express from 'express';
import {
    registerUser, loginUser, googleLogin, verifyTwoStep,
    forgotPassword, resetPassword, generateBackupCodes, getMe, getGoogleConfig,
    getAllUsers, deleteUser, updateUserRole, getPublicTeam,
    getUserProfile, updateUserProfile, getUserAddresses, addUserAddress,
    getUserCart, saveUserCart, getUserWishlist, saveUserWishlist, getUserCompare, saveUserCompare
} from '../controllers/auth-controller.js';
import { protect, adminOnly } from '../middleware/auth-middleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/google/config', getGoogleConfig);
router.post('/google', googleLogin);
router.post('/otp/verify-2step', verifyTwoStep);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/team', getPublicTeam);
router.post('/backup-codes', protect, generateBackupCodes);
router.get('/me', protect, getMe);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/addresses', protect, getUserAddresses);
router.post('/addresses', protect, addUserAddress);
router.get('/cart', protect, getUserCart);
router.put('/cart', protect, saveUserCart);
router.get('/wishlist', protect, getUserWishlist);
router.put('/wishlist', protect, saveUserWishlist);
router.get('/compare', protect, getUserCompare);
router.put('/compare', protect, saveUserCompare);

// Admin Routes
router.get('/', protect, adminOnly, getAllUsers);
router.delete('/:id', protect, adminOnly, deleteUser);
router.put('/:id/role', protect, adminOnly, updateUserRole);

export default router;
