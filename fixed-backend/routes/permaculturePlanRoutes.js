import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import {
    generateDraft,
    getPlans,
    getPlan,
    updateStatus,
    applyPlan,
} from '../controllers/permaculturePlanController.js';

const permaculturePlanRouter = express.Router();

// All routes require authentication
permaculturePlanRouter.post('/generate-draft',  verifyToken, generateDraft);
permaculturePlanRouter.get('/',                 verifyToken, getPlans);
permaculturePlanRouter.get('/:id',              verifyToken, getPlan);
permaculturePlanRouter.patch('/:id/status',     verifyToken, updateStatus);
permaculturePlanRouter.post('/:id/apply',       verifyToken, applyPlan);

export default permaculturePlanRouter;
