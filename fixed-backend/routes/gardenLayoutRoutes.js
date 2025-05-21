import express from 'express';
import { loadLayout, saveLayout } from '../controllers/gardenLayoutController.js';
import verifyToken from '../middleware/verifyToken.js';

const gardenLayoutRouter = express.Router();

gardenLayoutRouter.post('/save-layout',verifyToken, saveLayout );
gardenLayoutRouter.get('/load-layout', verifyToken, loadLayout);

export default gardenLayoutRouter;