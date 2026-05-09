import express from 'express';
import { generateGardenPlan } from '../controllers/aiController.js';
import verifyToken from '../middleware/verifyToken.js';

const aiRouter = express.Router();

aiRouter.post('/generate-garden', verifyToken, generateGardenPlan);

export default aiRouter;
