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