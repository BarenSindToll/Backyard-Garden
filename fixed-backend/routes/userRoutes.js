import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { uploadProfileImage } from '../controllers/userController.js';
import { getUserData } from '../controllers/userController.js';
import { getProfile, updateProfile } from '../controllers/userController.js';
import verifyToken from '../middleware/verifyToken.js';


const userRouter = express.Router();

userRouter.post('/get-data', userAuth, getUserData); // Change from `.get('/data'...)`
userRouter.get('/get-profile', verifyToken, getProfile);
userRouter.post('/update-profile', verifyToken, upload.single('profileImage'), updateProfile);

export default userRouter;
