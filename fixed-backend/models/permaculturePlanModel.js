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
    // Structured summary of what site analysis data was used/missing
    siteAnalysisSummary:  { type: mongoose.Schema.Types.Mixed, default: null },
}, { _id: false });

const proposedElementSchema = new mongoose.Schema({
    // ── Action & catalog linkage ──────────────────────────────────────────────
    action:          { type: String, default: 'create_new' },
    catalogKey:      { type: String, default: null },
    targetElementId: { type: String, default: null },
    enhancementType: { type: String, default: null },
    canonicalType:   { type: String, default: 'unknown' },

    // ── Type & identity ───────────────────────────────────────────────────────
    type:        { type: String, default: 'structure' }, // 'permaculture-zone' | 'structure' | 'planting-strip' | 'water-feature'
    name:        { type: String, required: true },

    // ── Permaculture zone (integer 0-5) ───────────────────────────────────────
    permacultureZone: { type: Number, min: 0, max: 5, default: null },
    targetZone:       { type: String, default: '' },   // string version for backward compat

    // ── Position (metres from garden top-left) ────────────────────────────────
    x:           { type: Number, default: 0 },
    y:           { type: Number, default: 0 },
    width:       { type: Number, default: 2 },
    height:      { type: Number, default: 2 },
    rotation:    { type: Number, default: 0 },

    // ── Plant content ─────────────────────────────────────────────────────────
    plants:      { type: [String], default: [] },

    // ── Placement rules ───────────────────────────────────────────────────────
    // Stable rule identifiers from PLACEMENT_RULES, e.g. ['near-house', 'full-sun']
    placementRules: { type: [String], default: [] },

    // ── AI reasoning & confidence ─────────────────────────────────────────────
    reason:      { type: String, default: '' },
    confidence:  { type: Number, min: 0, max: 1, default: 0.8 },
    warnings:    { type: [String], default: [] },

    // ── Spatial strategy fields ───────────────────────────────────────────────
    // Set by the generator; preserved by validation; displayed in preview.
    variantStrategy: { type: String, default: null },     // solar-priority | flow-access | water-gravity
    strategyReason:  { type: String, default: '' },       // 1-sentence why this strategy drove placement
    strategyTags:    { type: [String], default: [] },     // full-sun, daily-harvest, near-house, zone-1, etc.

    // ── Detail plan (for openable types: raised-bed, greenhouse, orchard, etc.) ─
    // Stores layout metadata for the detail view / bed editor.
    // Schema is flexible (Mixed) to support different layout types per element.
    // layoutType: 'rows' | 'blocks' | 'trees' | 'guild-layers' | 'berry-rows'
    detailPlan: { type: mongoose.Schema.Types.Mixed, default: null },
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
