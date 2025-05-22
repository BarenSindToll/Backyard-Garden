import userModel from "../models/userModel.js";

export const adminCheck = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.user.id);
        if (!user || !user.isAdmin) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
