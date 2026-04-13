import express from 'express';
import { getPersonas, createPersona } from '../controllers/personaController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getPersonas);
router.post('/', protect, createPersona);

export default router;
