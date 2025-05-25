import userModel from "../models/userModel.js";

export const adminCheck = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.user.id);

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        next();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
