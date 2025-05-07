import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { uploadProfileImage } from '../controllers/userController.js';
import { getUserData } from '../controllers/userController.js';
import userModel from '../models/userModel.js';
import { updateProfile } from '../controllers/userController.js';

const userRouter = express.Router();

userRouter.post('/get-data', userAuth, getUserData); // Change from `.get('/data'...)`

//userRouter.post('/save-grid', userAuth, saveGrid);
//userRouter.get('/load-grid', userAuth, loadGrid);
userRouter.post('/upload-profile-image', upload.single('profileImage'), uploadProfileImage);
userRouter.post('/update-profile', async (req, res) => {
    const { userId, name } = req.body;
    const user = await userModel.findById(userId);
    if (!user) return res.json({ success: false, message: 'User not found' });

    user.name = name;
    await user.save();
    res.json({ success: true, message: 'Name updated' });
});
userRouter.post('/update-name', async (req, res) => {
    const { userId, name } = req.body;
    try {
        const user = await userModel.findById(userId);
        if (!user) return res.json({ success: false, message: 'User not found' });

        user.name = name;
        await user.save();

        res.json({ success: true, message: 'Name updated' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});


export default userRouter;
