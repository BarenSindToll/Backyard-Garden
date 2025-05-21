import mongoose from 'mongoose';

const plantSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    sunlight: String,
    season: String,
    note: String,
    iconData: String, // filename or URL for the icon (e.g. 'basil.svg')
});

export default mongoose.models.Plant || mongoose.model('Plant', plantSchema);
