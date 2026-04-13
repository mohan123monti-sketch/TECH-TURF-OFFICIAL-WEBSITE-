import express from 'express';
import { getAttendance, markAttendance, getEmployeeAttendance } from '../controllers/attendanceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getAttendance);
router.post('/', protect, markAttendance);
router.get('/employee/:id', protect, getEmployeeAttendance);

export default router;
