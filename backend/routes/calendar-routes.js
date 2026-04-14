import express from 'express';
import {
    getTasks, createUpdateTask, deleteTask,
    getGoals, createUpdateGoal,
    getProjects, createUpdateProject,
    getHealth, createUpdateHealth,
    getReflections, createUpdateReflection,
    getPlanner, createPlannerBlock, deletePlannerBlock,
    getNotes, createUpdateNote, deleteNote
} from '../controllers/calendar-controller.js';
import { singleTenantFallback } from '../middleware/auth-middleware.js';

const router = express.Router();

// Tasks
router.get('/tasks', singleTenantFallback, getTasks);
router.post('/tasks', singleTenantFallback, createUpdateTask);
router.delete('/tasks/:id', singleTenantFallback, deleteTask);

// Goals
router.get('/goals', singleTenantFallback, getGoals);
router.post('/goals', singleTenantFallback, createUpdateGoal);
router.put('/goals/:id', singleTenantFallback, createUpdateGoal);

// Projects
router.get('/projects', singleTenantFallback, getProjects);
router.post('/projects', singleTenantFallback, createUpdateProject);
router.put('/projects/:id', singleTenantFallback, createUpdateProject);

// Health
router.get('/health', singleTenantFallback, getHealth);
router.post('/health', singleTenantFallback, createUpdateHealth);
router.put('/health/:id', singleTenantFallback, createUpdateHealth);

// Reflections
router.get('/reflections', singleTenantFallback, getReflections);
router.post('/reflections', singleTenantFallback, createUpdateReflection);
router.put('/reflections/:id', singleTenantFallback, createUpdateReflection);

// Planner
router.get('/planner', singleTenantFallback, getPlanner);
router.post('/planner', singleTenantFallback, createPlannerBlock);
router.delete('/planner/:id', singleTenantFallback, deletePlannerBlock);

// Notes
router.get('/notes', singleTenantFallback, getNotes);
router.post('/notes', singleTenantFallback, createUpdateNote);
router.put('/notes/:id', singleTenantFallback, createUpdateNote);
router.delete('/notes/:id', singleTenantFallback, deleteNote);

export default router;
