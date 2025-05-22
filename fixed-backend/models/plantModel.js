import mongoose from 'mongoose';

const plantSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    sunlight: String,
    season: String,
    note: String,
    iconData: String,
    featured: { type: Boolean, default: false },
    category: {
        type: String,
        enum: ['fruit', 'vegetable', 'herb', 'flower', 'tree'],
        deault: 'vegetable'
    }
});

export default mongoose.models.Plant || mongoose.model('Plant', plantSchema);
