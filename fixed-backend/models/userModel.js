import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    verifyOtp: { type: String, default: '' },
    verifyOtpExpireAt: { type: Number, default: 0 },
    isAccountVerified: { type: Boolean, default: false },
    resetOtp: { type: String, default: '' },
    resetOtpExpireAt: { type: Number, default: 0 },
    profileImage: { type: String, default: '' },
    location: { type: String, default: '' },

    zones: {
        type: [String],
        default: ['Zone 1'],
    },
    grids: {
        type: [[[String]]], // 3D array: array of 2D grid arrays
        default: [],
    },


})

const userModel = mongoose.models.user || mongoose.model('user', userSchema);

export default userModel;