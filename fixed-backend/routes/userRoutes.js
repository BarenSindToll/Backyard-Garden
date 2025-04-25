import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { getUserData } from '../controllers/userController.js';

const userRouter = express.Router();

userRouter.get('/data', userAuth, getUserData);
userRouter.post('/save-grid', userAuth, saveGrid);
userRouter.get('/load-grid', userAuth, loadGrid);

export default userRouter;
