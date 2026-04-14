import express from 'express';
import { getDashboardStats, getTopProducts } from '../controllers/stats-controller.js';
import { protect, adminOnly } from '../middleware/auth-middleware.js';

const router = express.Router();

router.get('/dashboard', protect, adminOnly, getDashboardStats);
router.get('/top-products', protect, adminOnly, getTopProducts);

export default router;
