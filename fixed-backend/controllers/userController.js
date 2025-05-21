import userModel from "../models/userModel.js";
import path from 'path';
import fs from 'fs';

export const getUserData = async (req, res) => {
    try {
        const { userId } = req.body;

        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: 'User not found.' });
        }

        return res.json({
            success: true,
            userData: {
                name: user.name,
                email: user.email,
                isAccountVerified: user.isAccountVerified,
                profileImage: user.profileImage,
                location: user.location,
            }
        });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getProfile = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};





export const uploadProfileImage = async (req, res) => {
    try {
        const { userId } = req.body;
        const image = req.file;

        if (!image) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const user = await userModel.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.profileImage = `/uploads/${image.filename}`;
        await user.save();

        res.json({ success: true, imagePath: user.profileImage });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateProfile = async (req, res) => {
    const { userId, newPassword, name, email, location } = req.body;

    try {
        const user = await userModel.findById(userId);
        if (!user) return res.json({ success: false, message: "User not found." });

        if (newPassword) {
            const hashed = await bcrypt.hash(newPassword, 10);
            user.password = hashed;
        }
        if (name) user.name = name;
        if (email) user.email = email;
        if (location) user.location = location;


        await user.save();
        res.json({ success: true, message: "Profile updated." });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
