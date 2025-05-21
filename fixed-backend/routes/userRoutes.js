import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { uploadProfileImage } from '../controllers/userController.js';
import { getUserData } from '../controllers/userController.js';
import userModel from '../models/userModel.js';
import { getProfile, updateProfile } from '../controllers/userController.js';
import bcrypt from 'bcryptjs';
import { verify } from 'crypto';
import verifyToken from '../middleware/verifyToken.js';
import { get } from 'http';


const userRouter = express.Router();

userRouter.post('/get-data', userAuth, getUserData); // Change from `.get('/data'...)`
userRouter.get('/get-profile', verifyToken, getProfile);
userRouter.post('/update-profile', verifyToken, upload.single('profileImage'), updateProfile);

export default userRouter;
