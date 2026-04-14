import express from 'express';
import { getDashboardStats, getTopProducts } from '../controllers/statsController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard', protect, adminOnly, getDashboardStats);
router.get('/top-products', protect, adminOnly, getTopProducts);

export default router;
