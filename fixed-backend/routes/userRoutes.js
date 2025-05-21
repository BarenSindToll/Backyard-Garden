import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { uploadProfileImage } from '../controllers/userController.js';
import { getUserData } from '../controllers/userController.js';
import userModel from '../models/userModel.js';
import { getProfile } from '../controllers/userController.js';
import bcrypt from 'bcryptjs';
import { verify } from 'crypto';
import verifyToken from '../middleware/verifyToken.js';
import { get } from 'http';


const userRouter = express.Router();

userRouter.post('/get-data', userAuth, getUserData); // Change from `.get('/data'...)`
userRouter.get('/get-profile', verifyToken, getProfile);
userRouter.post('/upload-profile-image', upload.single('profileImage'), uploadProfileImage);
userRouter.post('/update-profile', upload.single('profileImage'), async (req, res) => {
    const { userId, name, newPassword, email, location } = req.body;
    const user = await userModel.findById(userId);
    if (!user) return res.json({ success: false, message: 'User not found' });

    if (name) user.name = name;
    if (email) user.email = email;
    if (location) user.location = location;

    if (newPassword) {
        const hashed = await bcrypt.hash(newPassword, 10);
        user.password = hashed;
    }

    if (req.file) {
        user.profileImage = `/uploads/${req.file.filename}`;
    }

    await user.save();
    res.json({
        success: true, message: 'Profile updated successfully',
        updatedUser: {
            name: user.name,
            email: user.email,
            location: user.location,
            // 
        }
    });
});





export default userRouter;
