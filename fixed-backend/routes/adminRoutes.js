import express from 'express';
import { getAllUsers, toggleUserActive, sendAnnouncement, updateUser, deleteUser } from '../controllers/adminController.js';
import verifyToken from '../middleware/verifyToken.js';
import { adminCheck } from '../middleware/adminCheck.js';

const router = express.Router();

router.get('/users', verifyToken, adminCheck, getAllUsers);
router.put('/users/:id/toggle', verifyToken, adminCheck, toggleUserActive);
router.post('/announce', verifyToken, adminCheck, sendAnnouncement);
router.put('/users/:id', verifyToken, adminCheck, updateUser);
router.delete('/users/:id', verifyToken, adminCheck, deleteUser);


export default router;
