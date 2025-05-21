import mongoose from 'mongoose';

const plantSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    sunlight: String,
    season: String,
    note: String,
    iconData: String,
    featured: { type: Boolean, default: false }
});

export default mongoose.models.Plant || mongoose.model('Plant', plantSchema);
