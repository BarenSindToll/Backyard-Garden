import plant from '../models/plantModel.js';

export const getAllPlants = async (req, res) => {
    try {
        const plants = await plant.find();
        res.json({ success: true, plants });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
