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
    favoritePlants: { type: [String], default: '' },
    isActive: { type: Boolean, default: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    zone: { type: String, enum: ['5b', '6a', '6b', '7a', '7b'], default: '7b' }



})

const userModel = mongoose.models.user || mongoose.model('user', userSchema);

export default userModel;