import gardenLayoutModel from "../models/gardenLayoutModel.js";

export const loadLayout = async (req, res) => {
    const userId = req.user.id;
    try {
        const layout = await gardenLayoutModel.findOne({ userId });
        if (!layout) {
            return res.json({ success: false, message: 'Layout not found' });
        }
        res.json({ success: true, grids: layout.grids, zones: layout.zones, setup: layout.setup });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const saveLayout = async (req, res) => {
    const { grids, zones, setup } = req.body;
    const userId = req.user.id;
    try {
        await gardenLayoutModel.findOneAndUpdate(
            { userId },
            { grids, zones, setup },
            { new: true, upsert: true }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
