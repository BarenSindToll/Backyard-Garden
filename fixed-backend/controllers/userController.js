import userModel from "../models/userModel.js";

export const getUserData = async (req, res) => {
    try {
        const { userId } = req.body;

        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: 'User not found.' });
        }

        res.json({
            success: true,
            userData: {
                name: user.name,
                isAccountVerified: user.isAccountVerified
            }
        });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ✅ Save garden grid
export const saveGrid = async (req, res) => {
    try {
        const { grids } = req.body;
        const userId = req.user.id; // from auth middleware

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.savedGrids = grids;
        await user.save();

        res.json({ success: true, message: 'Grid saved successfully' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ Load garden grid
export const loadGrid = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, grids: user.savedGrids || [] });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
