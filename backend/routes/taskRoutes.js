import express from 'express';
import { getTasks, createUpdateTask, deleteTask, getUserTasks } from '../controllers/taskController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getTasks);
router.post('/', protect, createUpdateTask);
router.put('/:id', protect, createUpdateTask);
router.delete('/:id', protect, deleteTask);
router.get('/user/:userId', protect, getUserTasks);

export default router;
