// controllers/gardenStructureController.js
import GardenStructureModel from '../models/gardenStructureModel.js';

// Get all garden structures for a user
export const getAllStructures = async (req, res) => {
    try {
        const structures = await GardenStructure.find({ userId: req.user.id });
        res.json({ success: true, structures });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Create a new garden structure
export const createStructure = async (req, res) => {
    try {
        const newStructure = new GardenStructureModel({
            ...req.body,
            userId: req.user.id,
        });
        await newStructure.save();
        res.json({ success: true, structure: newStructure });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// Update an existing garden structure
export const updateStructure = async (req, res) => {
    try {
        const updatedStructure = await GardenStructure.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            req.body,
            { new: true }
        );
        if (!updatedStructure) {
            return res.status(404).json({ success: false, message: 'Structure not found' });
        }
        res.json({ success: true, structure: updatedStructure });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// Delete a garden structure
export const deleteStructure = async (req, res) => {
    try {
        const deleted = await GardenStructure.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Structure not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};
