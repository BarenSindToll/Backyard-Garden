// models/GardenStructure.js
import mongoose from 'mongoose';

const GardenStructureSchema = new mongoose.Schema({

    type: {
        type: String,
        enum: [
            'greenhouse',
            'guild',
            'raisedBed',
            'pond',
            'compost',
            'house',
            'path',
            'animalArea'
        ],
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    color: String,
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    radius: Number,
    zone: {
        type: String,
        default: 'main'
    },
    plants: [
        {
            name: String,
            iconData: String,
        }
    ],
    iconSvg: {
        type: String, // inline SVG markup or icon key
        default: null,
    },
}, { timestamps: true });

const GardenStructureModel = mongoose.models.GardenStructure || mongoose.model('GardenStructure', GardenStructureSchema);

export default GardenStructureModel;
