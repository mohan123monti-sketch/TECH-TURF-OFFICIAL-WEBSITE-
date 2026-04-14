import express from 'express';
import { getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee } from '../controllers/employee-controller.js';
import { protect, adminOnly } from '../middleware/auth-middleware.js';

const router = express.Router();

router.get('/', protect, getEmployees);
router.get('/:id', protect, getEmployeeById);
router.post('/', protect, adminOnly, createEmployee);
router.put('/:id', protect, adminOnly, updateEmployee);
router.delete('/:id', protect, adminOnly, deleteEmployee);

export default router;
