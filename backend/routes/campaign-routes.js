import express from 'express';
import { getCampaigns, createCampaign } from '../controllers/campaign-controller.js';
import { protect } from '../middleware/auth-middleware.js';

const router = express.Router();

router.get('/', protect, getCampaigns);
router.post('/', protect, createCampaign);

export default router;
