import mongoose from 'mongoose';

const plantSchema = new mongoose.Schema({
    // Basic Info
    name: { type: String, required: true, unique: true },
    botanicalName: String,
    sunlight: String, // 'Full Sun', 'Partial Shade'
    season: String,   // 'Spring–Fall', etc.
    perennial: { type: Boolean, default: false },
    enum: [
        'leafy green',       // e.g., Lettuce, Kale
        'root crop',         // Carrot, Beet, Radish
        'fruiting vegetable',// Tomato, Cucumber
        'bulb',              // Onion, Garlic
        'legume',            // Beans, Peas
        'grain',             // Corn, Wheat
        'herb',              // Basil, Parsley
        'flower',            // Marigold, Nasturtium
        'tree',              // Apple, Fig
        'shrub',             // Berry bush
        'vine',              // Grape, Pumpkin
        'cover crop',        // Clover, Vetch
        'dynamic accumulator', // Comfrey, Dandelion
        'medicinal',         // Yarrow, Chamomile
        'fungus',            // Mushrooms
        'succulent',         // Aloe, Purslane
        'grass',             // Lemongrass
        'aquatic',           // Watercress, Lotus
    ]
    ,
    iconData: String,
    note: String,
    featured: { type: Boolean, default: false },

    // Permaculture Roles
    guildRole: [String],               // ['Producer', 'Pollinator attractor']
    ecologicalFunctions: [String],    // ['Nitrogen fixer', 'Pest repellent']
    companions: [String],             // ['Carrot', 'Marigold']
    antagonists: [String],            // ['Potato']
    rotationGroup: String,            // e.g., 'Solanaceae'
    rootDepth: { type: String, enum: ['Shallow', 'Medium', 'Deep'] },
    soilNeeds: [String],              // ['Loamy', 'Well-drained']
    waterNeeds: { type: String, enum: ['Low', 'Medium', 'High'] },
    pH: String,                       // e.g., '6.0–7.0'
    spacingCm: Number,               // in centimeters

    // Succession Planning
    succession: {
        previous: [String],            // crops that should precede this
        next: [String],                // crops that follow well after
    },

    // Zone-Specific Planting Calendar
    planting: {
        zoneTimes: {
            type: Map,
            of: new mongoose.Schema({
                indoorStart: String,       // 'March 1'
                transplant: String,        // 'April 20'
                directSow: String,         // 'April 15'
                harvestStart: String,      // 'July 1'
                harvestEnd: String         // 'September 15'
            }, { _id: false })
        },
        daysToMaturity: Number         // e.g., 70
    }
});

export default mongoose.models.Plant || mongoose.model('Plant', plantSchema);
