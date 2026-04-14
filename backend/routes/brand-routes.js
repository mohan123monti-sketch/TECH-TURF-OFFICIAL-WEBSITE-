import express from 'express';
import { getBrand, saveBrand, getSettings, saveSettings } from '../controllers/brand-controller.js';
import { getPersonas, createPersona } from '../controllers/persona-controller.js';
import { protect } from '../middleware/auth-middleware.js';

const router = express.Router();

router.get('/brand', protect, getBrand);
router.post('/brand', protect, saveBrand);
router.get('/settings', protect, getSettings);
router.post('/settings', protect, saveSettings);
router.get('/personas', protect, getPersonas);
router.post('/personas', protect, createPersona);

export default router;
