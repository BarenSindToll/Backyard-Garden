import express from 'express';
import multer from 'multer';
import { getAllPlants, getFeaturedPlants, searchPlants, createPlant, deletePlant, updatePlant } from '../controllers/plantController.js';
import verifyToken from '../middleware/verifyToken.js';
import { adminCheck } from '../middleware/adminCheck.js';

const router = express.Router();
const upload = multer();

router.get('/all', getAllPlants);
router.get('/search', searchPlants);
router.get('/featured', getFeaturedPlants);
router.post('/create', verifyToken, adminCheck, upload.single('icon'), createPlant);
router.put('/update/:id', verifyToken, adminCheck, upload.single('icon'), updatePlant);
router.delete('/delete/:id', verifyToken, adminCheck, deletePlant);

export default router;
