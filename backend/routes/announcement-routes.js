import express from 'express';
import {
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} from '../controllers/announcement-controller.js';
import { protect, adminOnly } from '../middleware/auth-middleware.js';

const router = express.Router();


// Get all announcements
router.get('/', protect, adminOnly, getAllAnnouncements);

// Create new announcement
router.post('/', protect, adminOnly, createAnnouncement);

// Update announcement
router.put('/:id', protect, adminOnly, updateAnnouncement);

// Delete announcement
router.delete('/:id', protect, adminOnly, deleteAnnouncement);

export default router;
