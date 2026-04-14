import express from 'express';
import { chatWithAI, getChatHistory, analyzeBrandDNA, generateBrandCampaign } from '../controllers/ai-controller.js';
import { optionalAuth, protect, protectOrApiKey } from '../middleware/auth-middleware.js';

const router = express.Router();

router.post('/chat', protectOrApiKey, chatWithAI);
router.get('/chat', optionalAuth, getChatHistory);
router.post('/brand/analyze', protect, analyzeBrandDNA);
router.post('/brand/campaign', protect, generateBrandCampaign);

export default router;
