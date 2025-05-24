import Plant from '../models/plantModel.js';

export const getAllPlants = async (req, res) => {
    try {
        const plants = await Plant.find();
        res.json({ success: true, plants });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getFeaturedPlants = async (req, res) => {
    try {
        const plants = await Plant.find({ featured: true });
        res.json({ success: true, plants });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


export const searchPlants = async (req, res) => {
    try {
        const query = req.query.q || '';
        const regex = new RegExp('^' + query, 'i'); // match from start of string
        const plants = await Plant.find({ name: regex });
        res.json({ success: true, plants });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const createPlant = async (req, res) => {
    try {
        const { name, category } = req.body;
        const iconData = req.file?.buffer.toString('base64');

        if (!name || !category || !iconData) {
            return res.status(400).json({ success: false, message: 'Missing fields' });
        }

        const newPlant = new Plant({ name, category, iconData });
        await newPlant.save();

        res.json({ success: true, plant: newPlant });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


export const updatePlant = async (req, res) => {
    try {
        const { name, category } = req.body;
        const iconData = req.file?.buffer?.toString('base64');

        const updateFields = {};
        if (name) updateFields.name = name;
        if (category) updateFields.category = category;
        if (iconData) updateFields.iconData = iconData;

        const updated = await Plant.findByIdAndUpdate(req.params.id, updateFields, { new: true });

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Plant not found' });
        }

        res.json({ success: true, plant: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


export const deletePlant = async (req, res) => {
    try {
        const deleted = await Plant.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Plant not found' });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};