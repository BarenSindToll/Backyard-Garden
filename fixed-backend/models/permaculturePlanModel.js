import mongoose from 'mongoose';

const locationContextSchema = new mongoose.Schema({
    country:       { type: String, default: '' },
    city:          { type: String, default: '' },
    latitude:      { type: Number, default: null },
    longitude:     { type: Number, default: null },
    altitude:      { type: Number, default: null },
    hardinessZone: { type: String, default: '' },
    climateNotes:  { type: String, default: '' },
}, { _id: false });

const siteAnalysisSchema = new mongoose.Schema({
    // Original fields
    existingStructures:   { type: [String], default: [] },
    stableElements:       { type: [String], default: [] },
    slopeNotes:           { type: String, default: '' },
    sunExposureNotes:     { type: String, default: '' },
    windNotes:            { type: String, default: '' },
    waterFlowNotes:       { type: String, default: '' },
    soilNotes:            { type: String, default: '' },
    constraints:          { type: [String], default: [] },
    opportunities:        { type: [String], default: [] },
    // AI-generated fields
    climate:              { type: String, default: '' },
    waterStrategy:        { type: String, default: '' },
    soilStrategy:         { type: String, default: '' },
    accessStrategy:       { type: String, default: '' },
    biodiversityStrategy: { type: String, default: '' },
}, { _id: false });

const proposedElementSchema = new mongoose.Schema({
    type:        { type: String, default: 'structure' }, // 'permaculture-zone', 'structure', 'planting-strip', 'water-feature'
    name:        { type: String, required: true },
    targetZone:  { type: String, default: '' },          // permaculture design zone: '0','1','2','3','4','5'
    x:           { type: Number, default: 0 },           // metres from garden top-left
    y:           { type: Number, default: 0 },
    width:       { type: Number, default: 2 },           // metres
    height:      { type: Number, default: 2 },
    rotation:    { type: Number, default: 0 },
    plants:      { type: [String], default: [] },
    reason:      { type: String, default: '' },
    confidence:  { type: Number, min: 0, max: 1, default: 0.8 },
    warnings:    { type: [String], default: [] },
}, { _id: false });

const permaculturePlanSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },

    // Snapshot of the full garden layout at the time of generation
    sourceLayoutSnapshot: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },

    // Rich context assembled by permacultureContextService — safe to send to AI
    sourceContext: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },

    userRequirements: {
        freeText:        { type: String, default: '' },
        goals:           { type: [String], default: [] },
        focusAreas:      { type: [String], default: [] },
        preferredPlants: { type: [String], default: [] },
        excludedPlants:  { type: [String], default: [] },
    },

    locationContext: { type: locationContextSchema, default: () => ({}) },
    siteAnalysis:    { type: siteAnalysisSchema,    default: () => ({}) },

    proposedElements: { type: [proposedElementSchema], default: [] },

    summary:                 { type: String, default: '' },
    planNarrative:           { type: String, default: '' },
    plantingRecommendations: { type: [String], default: [] },
    maintenancePlan:         { type: [String], default: [] },
    planWarnings:            { type: [String], default: [] },
    bibliography:            { type: [String], default: [] },
    aiSource:                { type: String, enum: ['ai', 'mock', 'error', ''], default: '' },

    status: {
        type: String,
        enum: ['draft', 'applied', 'rejected'],
        default: 'draft',
    },
}, { timestamps: true });

export default mongoose.models.permaculturePlan
    || mongoose.model('permaculturePlan', permaculturePlanSchema);
