import express from 'express';
import { generateGardenPlan, generateZoneBeds } from '../controllers/aiController.js';
import verifyToken from '../middleware/verifyToken.js';

const aiRouter = express.Router();

aiRouter.post('/generate-garden', verifyToken, generateGardenPlan);
aiRouter.post('/generate-zone-beds', verifyToken, generateZoneBeds);

export default aiRouter;
