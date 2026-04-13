import express from 'express';
import { getDashboardStats } from '../controllers/statsController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard', protect, adminOnly, getDashboardStats);

export default router;
