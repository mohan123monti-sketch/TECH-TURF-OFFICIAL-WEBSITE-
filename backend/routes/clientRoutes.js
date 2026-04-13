import express from 'express';
import { getClients, getClientById, createClient, updateClient, deleteClient } from '../controllers/clientController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getClients);
router.get('/:id', protect, getClientById);
router.post('/', protect, createClient);
router.put('/:id', protect, updateClient);
router.delete('/:id', protect, deleteClient);

export default router;
