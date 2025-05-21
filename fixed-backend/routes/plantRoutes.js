import express from 'express';
import { getAllPlants } from '../controllers/plantController.js';

const router = express.Router();

router.get('/all', getAllPlants);

export default router;
