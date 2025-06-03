
import mongoose from "mongoose";

const gridCellSchema = new mongoose.Schema({
  plant: String,               // plant name or ID
  plantedDate: String,         // ISO date string
  expectedHarvest: String,    // ISO date string
  notes: String,               // optional user notes
  warnings: [String],          // computed warnings
}, { _id: false });

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
    type: [[[gridCellSchema]]], // 3D array: zones → rows → columns → gridCell
    default: [],
  },
});

const gardenLayoutModel = mongoose.models.gardenLayout || mongoose.model('gardenLayout', gardenLayoutSchema);

export default gardenLayoutModel;
