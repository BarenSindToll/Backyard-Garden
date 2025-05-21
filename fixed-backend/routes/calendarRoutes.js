import express from 'express';
import { loadCalendar, saveCalendar } from '../controllers/calendarController.js';
import verifyToken from '../middleware/verifyToken.js';

const router = express.Router();

router.get('/load', verifyToken, loadCalendar);
router.post('/save', verifyToken, saveCalendar);

export default router;
