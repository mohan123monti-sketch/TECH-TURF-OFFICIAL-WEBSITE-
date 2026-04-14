import express from 'express';
import { getAttendance, markAttendance, getEmployeeAttendance } from '../controllers/attendance-controller.js';
import { protect } from '../middleware/auth-middleware.js';

const router = express.Router();

router.get('/', protect, getAttendance);
router.post('/', protect, markAttendance);
router.get('/employee/:id', protect, getEmployeeAttendance);

export default router;
