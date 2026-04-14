import express from 'express';
import { getProjects, getProjectById, createProject, updateProject, deleteProject } from '../controllers/project-controller.js';
import { protect } from '../middleware/auth-middleware.js';

const router = express.Router();

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', protect, createProject);
router.put('/:id', protect, updateProject);
router.delete('/:id', protect, deleteProject);

export default router;
