import gardenLayoutModel from "../models/gardenLayoutModel.js";

export const loadLayout = async (req, res) => {
 const userId = req.user.id;
const layout = await gardenLayoutModel.findOne({ userId });

  try {
    const layout = await gardenLayoutModel.findOne({ userId });
    if (!layout) {
      console.log('No layout found for:', userId);
      return res.json({ success: false, message: 'Layout not found' });
    }

    res.json({ success: true, grids: layout.grids, zones: layout.zones });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



export const saveLayout = async (req, res) => {
  const { grids, zones } = req.body;
  const userId = req.user.id;

  try {
    const layout = await gardenLayoutModel.findOneAndUpdate(
      { userId },
      { grids, zones },
      { new: true, upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
