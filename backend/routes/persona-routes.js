import express from 'express';
import { getPersonas, createPersona } from '../controllers/persona-controller.js';
import { protect } from '../middleware/auth-middleware.js';

const router = express.Router();

router.get('/', protect, getPersonas);
router.post('/', protect, createPersona);

export default router;
