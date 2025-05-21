import mongoose from "mongoose";

const gardenLayoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  zones: {
        type: [String],
        default: ['Zone 1'],
    },
    grids: {
        type: [[[String]]], // 3D array: array of 2D grid arrays
        default: [],
    },
});

const gardenLayoutModel = mongoose.models.gardenLayout || mongoose.model('gardenLayout', gardenLayoutSchema);

export default gardenLayoutModel;