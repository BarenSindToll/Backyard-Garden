import mongoose from 'mongoose';

const gridCellSchema = new mongoose.Schema({
    plant: String,
    plantedDate: String,
    expectedHarvest: String,
    notes: String,
    warnings: [String],
    spanCols: { type: Number, default: 1 },
    spanRows: { type: Number, default: 1 },
    isStructure: { type: Boolean, default: false },
}, { _id: false });

const setupSchema = new mongoose.Schema({
    gardenName: { type: String, default: 'My Garden' },
    widthM: { type: Number, default: 10 },
    heightM: { type: Number, default: 10 },
    country: { type: String, default: '' },
    hardinessZone: { type: String, default: '7b' },
    climate: { type: String, default: 'Temperate' },
    cellSizeM: { type: Number, default: 1 },
    focusAreas: { type: [String], default: [] },
    goals: { type: [String], default: [] },
}, { _id: false });

const gardenLayoutSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    zones: { type: [String], default: ['Zone 1'] },
    grids: { type: [[[gridCellSchema]]], default: [] },
    setup: { type: setupSchema, default: () => ({}) },
    positions: { type: [Object], default: [] },
    overlayItems: { type: [mongoose.Schema.Types.Mixed], default: [] },
    bedLayouts: { type: mongoose.Schema.Types.Mixed, default: {} },
    zoneItems: { type: mongoose.Schema.Types.Mixed, default: {} },
});

export default mongoose.models.gardenLayout || mongoose.model('gardenLayout', gardenLayoutSchema);
