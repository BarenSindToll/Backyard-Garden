import express from 'express';
import { getAllPlants, getFeaturedPlants, searchPlants } from '../controllers/plantController.js';

const router = express.Router();

router.get('/all', getAllPlants);
router.get('/search', searchPlants);
router.get('/featured', getFeaturedPlants);

export default router;
