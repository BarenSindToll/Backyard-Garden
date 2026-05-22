/**
 * permacultureAiService.js
 *
 * Multi-provider AI backend for permaculture plan generation.
 * Supported providers: anthropic | openai | ollama
 * Falls back to null (caller uses rule-based mock) when AI is disabled or fails.
 *
 * Env variables:
 *   AI_ENABLED   = "true"                  — must be exactly "true" to activate AI
 *   AI_PROVIDER  = anthropic | openai | ollama
 *   AI_MODEL     = <model id>              — e.g. gpt-4.1-mini / llama3.1:8b / claude-sonnet-4-6
 *   AI_API_KEY   = <key>                   — for anthropic/openai (overrides provider-specific key)
 *   ANTHROPIC_API_KEY = <key>             — fallback for anthropic
 *   OPENAI_API_KEY    = <key>             — fallback for openai
 *   OLLAMA_URL   = http://localhost:11434  — base URL for local Ollama instance
 *
 * API keys are NEVER logged or returned to callers.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { CATALOG_KEY_SET, VALID_ACTIONS, getCatalogForAI } from '../utils/structureCatalogUtils.js';


// ── Configuration (read once at startup) ─────────────────────────────────────

const AI_ENABLED = process.env.AI_ENABLED === 'true';
const AI_PROVIDER = (process.env.AI_PROVIDER || 'anthropic').toLowerCase().trim();
const AI_MODEL = (process.env.AI_MODEL || '').trim();
const AI_API_KEY = (process.env.AI_API_KEY || '').trim();
const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');

// Per-provider key resolution (never logged)
function resolveKey(provider) {
    if (AI_API_KEY) return AI_API_KEY;
    if (provider === 'anthropic') return (process.env.ANTHROPIC_API_KEY || '').trim();
    if (provider === 'openai') return (process.env.OPENAI_API_KEY || '').trim();
    return '';
}

// Per-provider default models
const DEFAULT_MODELS = {
    anthropic: 'claude-sonnet-4-6',
    openai: 'gpt-4.1-mini',
    ollama: 'llama3.1:8b',
};

function effectiveModel() {
    return AI_MODEL || DEFAULT_MODELS[AI_PROVIDER] || 'gpt-4.1-mini';
}

// ── Shared prompt (identical across providers) ────────────────────────────────

const SYSTEM_PROMPT = `You are a certified professional permaculture garden designer with 20 years of experience in temperate-climate design. You apply the twelve Holmgren design principles rigorously and have deep knowledge of zones and sectors analysis, companion planting, guild design, water harvesting, no-dig soil building, and sustainable land management.

YOUR TASK
Generate a complete, site-specific permaculture plan for the garden described in the user message.
Your response must be ONLY a single valid JSON object — no markdown fences, no explanations, no comments, no text before or after the JSON.

STRUCTURE SOURCES (critically important — you have exactly two):
1. existingMapStructures — real objects already placed on the garden map. Each has an "id".
2. availableStructureCatalog — objects that MAY be newly created. Each has a "catalogKey".

HARD RULES — follow these without exception:
R1. Always check existingMapStructures first before proposing any structure.
R2. If a suitable existing structure is present, enhance it or plant inside it — do NOT create a duplicate.
R3. Never create a new pond if a pond already exists. Propose pond-edge planting instead.
R4. Never create a new raised bed if suitable raised beds already exist, unless the user explicitly asked for more.
R5. Never create a new compost system if compost already exists.
R6. Never create a new greenhouse if a greenhouse already exists.
R7. Only use action=create_new when: (a) no suitable existing structure exists AND (b) the canonicalType exists in availableStructureCatalog with canCreateNew=true.
R8. Never invent a structure type that is not present in availableStructureCatalog.
R9. If you cannot place something as create_new or enhance_existing, use action=recommendation_only instead of inventing a random structure.
R10. Use targetElementId (matching an id from existingMapStructures) when recommending changes to an existing structure.
R11. Use catalogKey (from availableStructureCatalog) when proposing a new structure.

REQUIRED OUTPUT SCHEMA:
{
  "summary": "<2-4 sentence executive summary>",
  "siteAnalysis": {
    "climate": "<climate description>",
    "existingStructures": ["<name>"],
    "constraints": ["<sentence>"],
    "opportunities": ["<sentence>"],
    "waterStrategy": "<approach>",
    "soilStrategy": "<approach>",
    "accessStrategy": "<approach>",
    "biodiversityStrategy": "<approach>"
  },
  "proposedElements": [
    // For a NEW structure from the catalog:
    {
      "action": "create_new",
      "catalogKey": "<key from availableStructureCatalog>",
      "canonicalType": "<same as catalogKey>",
      "type": "<structure | planting-strip | water-feature | permaculture-zone>",
      "name": "<descriptive name>",
      "targetZone": "<0-5>",
      "x": <metres>, "y": <metres>, "width": <metres>, "height": <metres>,
      "rotation": 0,
      "plants": [], "reason": "", "confidence": 0.8, "warnings": []
    },
    // For ENHANCING an existing structure:
    {
      "action": "enhance_existing",
      "targetElementId": "<id from existingMapStructures>",
      "canonicalType": "<canonicalType of target>",
      "enhancementType": "<pond_edge_planting | companion_planting | windbreak_extension | ...>",
      "type": "planting-strip",
      "name": "<descriptive name>",
      "x": <target xM>, "y": <target yM>, "width": <target wM + 2>, "height": <target hM + 2>,
      "plants": [], "reason": "", "confidence": 0.8, "warnings": []
    },
    // For PLANTING INSIDE an existing structure:
    {
      "action": "plant_inside_existing",
      "targetElementId": "<id from existingMapStructures>",
      "canonicalType": "<canonicalType of target>",
      "enhancementType": "companion_planting_group",
      "type": "planting-strip",
      "name": "<descriptive name>",
      "x": <target xM>, "y": <target yM>, "width": <target wM>, "height": <target hM>,
      "plants": [], "reason": "", "confidence": 0.8, "warnings": []
    },
    // For adding NEAR an existing structure:
    {
      "action": "add_near_existing",
      "targetElementId": "<id from existingMapStructures>",
      "catalogKey": "<key from availableStructureCatalog>",
      "canonicalType": "<canonicalType>",
      "type": "structure",
      "name": "<descriptive name>",
      "x": <metres near target>, "y": <metres near target>,
      "width": <metres>, "height": <metres>,
      "plants": [], "reason": "", "confidence": 0.8, "warnings": []
    },
    // For TEXT-ONLY recommendations (no map placement):
    {
      "action": "recommendation_only",
      "canonicalType": "<canonicalType or 'general'>",
      "type": "structure",
      "name": "<recommendation title>",
      "x": 0, "y": 0, "width": 1, "height": 1,
      "plants": [], "reason": "<detailed recommendation>", "confidence": 0.7, "warnings": []
    }
  ],
  "plantingRecommendations": ["<sentence>"],
  "maintenancePlan": ["<sentence>"],
  "warnings": ["<global warning>"],
  "bibliography": ["<full citation>"]
}

DESIGN RULES
D1. Never place create_new elements on or overlapping stable structures (House, Shed, Fence).
D2. Zone 1 crops must be close to the house or main access path.
D3. Apply zones & sectors: sun from south (northern hemisphere), windbreaks on windward side, ponds at lowest point.
D4. Use companion guilds: fruit tree + comfrey + yarrow + nasturtium + groundcover.
D5. Romania/Eastern Europe: prefer cold-hardy species (apple, plum, hawthorn, elderflower, comfrey, yarrow).
D6. If slope data is missing, write "Slope data unavailable" in warnings — do not guess.
D7. All coordinates are in metres. x + width <= gardenWidthM; y + height <= gardenHeightM.
D8. confidence: 0.9-1.0 = well-supported; 0.65-0.85 = estimated; 0.4-0.64 = data-poor.
D9. Include at least Mollison (1988) and Holmgren (2002) in bibliography.
D10. Output nothing except the JSON object.`;

// ── Context message (same for all providers) ──────────────────────────────────

function buildContextMessage(siteContext) {
    try {
        const gl = siteContext.gardenLayout || {};
        const lc = siteContext.locationContext || {};
        const el = siteContext.existingElements || {};
        const sc = siteContext.siteCharacteristics || {};
        const ur = siteContext.userRequirements || {};
        const pc = siteContext.permacultureContext || {};
        const up = siteContext.userProfile || {};

        const norm = ur.normalized || {};
        const raw = ur.raw || {};
        const flags = el.flags || {};

        const stablePos = Object.values(el.structuresByType || {})
            .flat()
            .filter(s => (el.stableElements || []).includes(s.name))
            .map(s => `  • ${s.name}: x=${s.xM ?? '?'}m y=${s.yM ?? '?'}m ${s.wM ?? '?'}×${s.hM ?? '?'}m`)
            .join('\n') || '  None with known positions';

        const constraints = (sc.constraints || [])
            .map(c => `  [${(c.severity || 'info').toUpperCase()}] ${c.message}`)
            .join('\n') || '  None detected';

        const opportunities = (sc.opportunities || [])
            .map(o => `  [${(o.priority || 'medium').toUpperCase()}] ${o.title}: ${o.description}`)
            .join('\n') || '  None detected';

        const zones = Object.entries(sc.inferredPermacultureZones || {})
            .map(([z, info]) => `  Zone ${z} — ${info.label}: ${(info.recommended || []).join(', ')}`)
            .join('\n') || '  Not calculated';

        const guilds = (pc.guildOpportunities || [])
            .filter(g => g.readiness !== 'no-overlap')
            .slice(0, 4)
            .map(g => `  ${g.guild}: add [${(g.toAdd || []).join(', ')}]`)
            .join('\n') || '  Start fresh';

        // ── Catalog-aware sections ────────────────────────────────────────────
        const existingStructures = (siteContext.existingMapStructures || []);
        const catalog            = siteContext.availableStructureCatalog || getCatalogForAI();
        const avail              = siteContext.structureAvailabilitySummary || {};
        const policy             = siteContext.plannerPolicy || {};

        const existingStructureLines = existingStructures.length
            ? existingStructures.map(s =>
                `  • id="${s.id}" name="${s.name}" canonicalType=${s.canonicalType} ` +
                `pos=(${s.xM ?? '?'},${s.yM ?? '?'})m size=${s.wM ?? '?'}×${s.hM ?? '?'}m ` +
                `canEnhance=${s.canBeEnhanced} canPlantInside=${s.canContainPlants}`
              ).join('\n')
            : '  (none)';

        const catalogLines = catalog.length
            ? catalog.map(c =>
                `  • catalogKey=${c.catalogKey} displayName="${c.displayName}" ` +
                `size=${c.defaultWidthM}×${c.defaultHeightM}m canPlantInside=${c.canContainPlants}`
              ).join('\n')
            : '  (none)';

        return `Generate a permaculture plan for this garden:

DIMENSIONS
  Width: ${gl.widthM ?? '?'} m | Height: ${gl.heightM ?? '?'} m | Area: ${gl.areaM2 ?? '?'} m²

LOCATION
  Country: ${lc.country || gl.country || 'Unknown'} | City: ${lc.city || 'Unknown'}
  Hardiness zone: ${lc.hardinessZone || gl.hardinessZone || '7b'}
  Climate: ${lc.climateNotes || gl.climate || 'Temperate'}
  Latitude: ${lc.latitude ?? 'Unknown'} | Longitude: ${lc.longitude ?? 'Unknown'}

USER PROFILE
  Favourite plants: ${(up.favoritePlants || []).join(', ') || 'None'}

== EXISTING MAP STRUCTURES (check before creating anything) ==
${existingStructureLines}

  AVAILABILITY SUMMARY:
  Pond:       existing=${avail.hasExistingPond ?? false}  catalog=${avail.hasCatalogPond ?? true}
  RaisedBed:  existing=${avail.hasExistingRaisedBed ?? false}  catalog=${avail.hasCatalogRaisedBed ?? true}
  Compost:    existing=${avail.hasExistingCompost ?? false}  catalog=${avail.hasCatalogCompost ?? true}
  Greenhouse: existing=${avail.hasExistingGreenhouse ?? false}  catalog=${avail.hasCatalogGreenhouse ?? true}
  Coop:       existing=${avail.hasExistingCoop ?? false}  catalog=${avail.hasCatalogCoop ?? true}

== AVAILABLE STRUCTURE CATALOG (only these may be created new) ==
${catalogLines}

PLANNER POLICY:
  ${Object.entries(policy).map(([k, v]) => `${k}=${v}`).join('  ')}

STABLE STRUCTURES (never build on these):
${stablePos}
  All names: ${(el.stableElements || []).join(', ') || 'None'}

PLANTING ZONES:
${(el.plantingZones || []).map(z => `  • ${z.name}: ${z.gridRows}×${z.gridCols} cells — [${(z.plants || []).slice(0, 6).join(', ')}]`).join('\n') || '  None'}

EXISTING PLANTS: ${(el.uniquePlants || []).join(', ') || 'None'}

CONSTRAINTS:
${constraints}

OPPORTUNITIES:
${opportunities}

PERMACULTURE ZONES (guidance):
${zones}

GUILD OPPORTUNITIES:
${guilds}

WATER STRATEGY: ${pc.waterStrategy?.primary || 'balanced'} — ${(pc.waterStrategy?.approaches || []).slice(0, 2).join('; ')}
SOIL STRATEGY: ${pc.soilStrategy?.approach || 'build-and-maintain'}

USER REQUIREMENTS
  Goals: ${(norm.goals || []).join(', ') || 'Not specified'}
  Style: ${norm.inferredStyle || 'Not specified'}
  Time: ${norm.timeCommitment || 'Not specified'}
  Preferred plants: ${(norm.preferredPlants || []).join(', ') || 'Not specified'}
  Avoid: ${(norm.excludedPlants || []).join(', ') || 'None'}
  Problems: ${(norm.inferredProblems || []).join(', ') || 'None'}
  Notes: ${raw.freeText || 'None'}

Output ONLY the JSON object — no markdown, no text outside the JSON.`;
    } catch (err) {
        console.error('[permacultureAiService] buildContextMessage error:', err.message);
        return 'Generate a basic permaculture plan. Output ONLY valid JSON matching the schema.';
    }
}

// ── JSON extraction & validation ──────────────────────────────────────────────

const VALID_TYPES = new Set(['permaculture-zone', 'structure', 'planting-strip', 'water-feature']);
const REQUIRED_TOP_KEYS = ['summary', 'siteAnalysis', 'proposedElements', 'bibliography'];

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function toStringArray(val) {
    if (!Array.isArray(val)) return [];
    return val.filter(Boolean).map(v => String(v).slice(0, 500));
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh, m = 0.3) {
    return ax < bx + bw + m && ax + aw > bx - m && ay < by + bh + m && ay + ah > by - m;
}

/**
 * Extract JSON from raw model output, validate against the action-based schema,
 * clamp coordinates, and apply post-processing policy rules.
 *
 * @param {string}   rawText
 * @param {number}   gardenW
 * @param {number}   gardenH
 * @param {object[]} stableStructs          – stable overlay items with xM/yM/wM/hM
 * @param {Set}      catalogKeySet          – valid catalogKey values (from CATALOG_KEY_SET)
 * @param {object[]} existingMapStructures  – from siteContext, keyed by id
 * @returns {{ ok, plan, errors }}
 */
function parseAndValidate(
    rawText,
    gardenW,
    gardenH,
    stableStructs        = [],
    catalogKeySet        = CATALOG_KEY_SET,
    existingMapStructures = []
) {
    const errors = [];
    let text = (rawText || '').trim();

    // Strip markdown fences
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) text = fence[1].trim();

    // Skip leading prose
    const brace = text.indexOf('{');
    if (brace > 0) text = text.slice(brace);

    // Trim trailing garbage after the last closing brace
    const lastBrace = text.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace < text.length - 1) text = text.slice(0, lastBrace + 1);

    let parsed;
    try { parsed = JSON.parse(text); }
    catch (e) { return { ok: false, errors: [`JSON parse failed: ${e.message}`] }; }

    for (const k of REQUIRED_TOP_KEYS) {
        if (!(k in parsed)) errors.push(`Missing key: ${k}`);
    }
    if (errors.length) return { ok: false, errors };

    const W = Number(gardenW) || 10;
    const H = Number(gardenH) || 10;

    // Build fast lookup of existing structure IDs
    const existingById = new Map(existingMapStructures.map(s => [String(s.id), s]));

    const normSA = (raw = {}) => ({
        climate:              String(raw.climate || '').slice(0, 500),
        existingStructures:   toStringArray(raw.existingStructures),
        constraints:          toStringArray(raw.constraints),
        opportunities:        toStringArray(raw.opportunities),
        waterStrategy:        String(raw.waterStrategy || '').slice(0, 600),
        soilStrategy:         String(raw.soilStrategy || '').slice(0, 600),
        accessStrategy:       String(raw.accessStrategy || '').slice(0, 600),
        biodiversityStrategy: String(raw.biodiversityStrategy || '').slice(0, 600),
    });

    const plan = {
        summary:                 String(parsed.summary || '').slice(0, 2000),
        siteAnalysis:            normSA(parsed.siteAnalysis),
        proposedElements:        [],
        plantingRecommendations: toStringArray(parsed.plantingRecommendations),
        maintenancePlan:         toStringArray(parsed.maintenancePlan),
        warnings:                toStringArray(parsed.warnings),
        bibliography:            toStringArray(parsed.bibliography),
    };

    const rawElements = Array.isArray(parsed.proposedElements) ? parsed.proposedElements : [];

    for (let i = 0; i < rawElements.length; i++) {
        const el = rawElements[i];
        if (!el || typeof el !== 'object') { errors.push(`Element ${i}: not an object`); continue; }
        if (!el.name) { errors.push(`Element ${i}: missing name`); continue; }

        // ── Resolve / validate action ────────────────────────────────────────
        let action = VALID_ACTIONS.has(el.action) ? el.action : 'create_new';
        const elWarnings = toStringArray(el.warnings);

        // ── Validate catalogKey for create_new / add_near_existing ───────────
        if ((action === 'create_new' || action === 'add_near_existing') && el.catalogKey) {
            if (!catalogKeySet.has(el.catalogKey)) {
                elWarnings.push(`catalogKey "${el.catalogKey}" not in catalog — converted to recommendation_only`);
                console.warn(`[parseAndValidate] Element "${el.name}": unknown catalogKey "${el.catalogKey}" — downgrading to recommendation_only`);
                action = 'recommendation_only';
            }
        } else if (action === 'create_new' && !el.catalogKey) {
            elWarnings.push('create_new action requires catalogKey — converted to recommendation_only');
            console.warn(`[parseAndValidate] Element "${el.name}": create_new missing catalogKey — downgrading to recommendation_only`);
            action = 'recommendation_only';
        }

        // ── Validate targetElementId for enhance / plant_inside ──────────────
        if (action === 'enhance_existing' || action === 'plant_inside_existing' || action === 'add_near_existing') {
            if (el.targetElementId && !existingById.has(String(el.targetElementId))) {
                elWarnings.push(`targetElementId "${el.targetElementId}" not found in map — converted to recommendation_only`);
                console.warn(`[parseAndValidate] Element "${el.name}": unknown targetElementId "${el.targetElementId}" — downgrading to recommendation_only`);
                action = 'recommendation_only';
            }
        }

        // ── Coordinate handling ──────────────────────────────────────────────
        // recommendation_only elements get placeholder coords; others are clamped
        const w = Math.max(0.5, Number(el.width) || 2);
        const h = Math.max(0.3, Number(el.height) || 2);
        let x, y;

        if (action === 'recommendation_only') {
            x = 0; y = 0;
        } else {
            x = clamp(Number(el.x) || 0, 0, Math.max(0, W - w));
            y = clamp(Number(el.y) || 0, 0, Math.max(0, H - h));
        }

        // ── Stable-structure overlap check (only for create_new) ─────────────
        if (action === 'create_new' || action === 'add_near_existing') {
            for (const s of stableStructs) {
                if (s.xM == null || s.yM == null) continue;
                if (rectsOverlap(x, y, w, h, s.xM, s.yM, s.wM ?? 2, s.hM ?? 2)) {
                    elWarnings.push(`Potential overlap with stable structure "${s.name}" — adjust manually`);
                }
            }
        }

        const normalised = {
            action,
            catalogKey:      el.catalogKey      ? String(el.catalogKey).slice(0, 50)      : undefined,
            targetElementId: el.targetElementId ? String(el.targetElementId).slice(0, 100) : undefined,
            enhancementType: el.enhancementType ? String(el.enhancementType).slice(0, 80)  : undefined,
            canonicalType:   el.canonicalType   ? String(el.canonicalType).slice(0, 50)    : (el.catalogKey || 'unknown'),
            type:            VALID_TYPES.has(el.type) ? el.type : 'structure',
            name:            String(el.name || 'Unnamed').slice(0, 120),
            targetZone:      String(el.targetZone ?? '').slice(0, 5),
            x, y,
            width:    w,
            height:   h,
            rotation: Number.isFinite(Number(el.rotation)) ? Math.round(Number(el.rotation)) : 0,
            plants:   toStringArray(el.plants),
            reason:   String(el.reason || '').slice(0, 500),
            confidence: clamp(isNaN(Number(el.confidence)) ? 0.8 : Number(el.confidence), 0, 1),
            warnings: elWarnings,
        };

        // Remove undefined keys for cleanliness
        for (const k of ['catalogKey', 'targetElementId', 'enhancementType']) {
            if (normalised[k] === undefined) delete normalised[k];
        }

        plan.proposedElements.push(normalised);
    }

    if (plan.bibliography.length === 0) {
        plan.bibliography = [
            "Mollison, B. (1988). Permaculture: A Designers' Manual. Tagari Publications.",
            "Holmgren, D. (2002). Permaculture: Principles and Pathways Beyond Sustainability.",
        ];
    }

    console.log(`[parseAndValidate] ${plan.proposedElements.length} elements validated. Actions: ${
        [...new Set(plan.proposedElements.map(e => e.action))].join(', ')
    }`);

    return { ok: true, plan, errors };
}

// ── Provider: Anthropic ───────────────────────────────────────────────────────

function extractParseArgs(siteContext) {
    const gardenW = siteContext.gardenLayout?.widthM || 10;
    const gardenH = siteContext.gardenLayout?.heightM || 10;
    const stables = Object.values(siteContext.existingElements?.structuresByType || {})
        .flat().filter(s => (siteContext.existingElements?.stableElements || []).includes(s.name));
    const catKeys = new Set(
        (siteContext.availableStructureCatalog || []).map(e => e.catalogKey).filter(Boolean)
    );
    const existing = siteContext.existingMapStructures || [];
    return { gardenW, gardenH, stables, catKeys, existing };
}

async function callAnthropic(siteContext, model, apiKey) {
    const client = new Anthropic({ apiKey });
    const { gardenW, gardenH, stables, catKeys, existing } = extractParseArgs(siteContext);

    const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: buildContextMessage(siteContext) }],
    });

    const raw = response.content.filter(c => c.type === 'text').map(c => c.text).join('');
    console.log(`[AI/anthropic] model=${model} in=${response.usage?.input_tokens} out=${response.usage?.output_tokens} cached=${response.usage?.cache_read_input_tokens ?? 0}`);
    return parseAndValidate(raw, gardenW, gardenH, stables, catKeys, existing);
}

// ── Provider: OpenAI ──────────────────────────────────────────────────────────

async function callOpenAI(siteContext, model, apiKey) {
    const client = new OpenAI({ apiKey });
    const { gardenW, gardenH, stables, catKeys, existing } = extractParseArgs(siteContext);

    const response = await client.chat.completions.create({
        model,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildContextMessage(siteContext) },
        ],
    });

    const raw = response.choices[0]?.message?.content || '';
    const usage = response.usage || {};
    console.log(`[AI/openai] model=${model} in=${usage.prompt_tokens} out=${usage.completion_tokens}`);
    return parseAndValidate(raw, gardenW, gardenH, stables, catKeys, existing);
}

// ── Provider: Ollama ──────────────────────────────────────────────────────────

async function callOllama(siteContext, model) {
    const { gardenW, gardenH, stables, catKeys, existing } = extractParseArgs(siteContext);

    const body = JSON.stringify({
        model,
        stream: false,
        format: 'json',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildContextMessage(siteContext) },
        ],
    });

    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Ollama HTTP ${res.status}: ${txt.slice(0, 200)}`);
    }

    const data = await res.json();
    const raw = data?.message?.content || '';
    console.log(`[AI/ollama] model=${model} url=${OLLAMA_URL} chars=${raw.length}`);
    return parseAndValidate(raw, gardenW, gardenH, stables, catKeys, existing);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a permaculture plan using the configured AI provider.
 *
 * Returns the validated plan object on success, or null when:
 *   - AI_ENABLED !== "true"
 *   - the provider is unknown
 *   - the provider call throws or returns invalid JSON
 *
 * The caller is responsible for falling back to rule-based generation when
 * this function returns null.
 *
 * @param {object} siteContext – output of buildPermacultureContext()
 * @returns {Promise<object|null>}
 */
export async function generatePermaculturePlanWithAI(siteContext) {
    if (!AI_ENABLED) {
        console.log('[AI] AI_ENABLED is not "true" — skipping AI call');
        return null;
    }

    const model = effectiveModel();
    const apiKey = resolveKey(AI_PROVIDER);

    console.log(`[AI] provider=${AI_PROVIDER} model=${model} enabled=true`);

    try {
        let result;

        if (AI_PROVIDER === 'anthropic') {
            if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
                console.warn('[AI] anthropic: API key not set — skipping');
                return null;
            }
            result = await callAnthropic(siteContext, model, apiKey);

        } else if (AI_PROVIDER === 'openai') {
            if (!apiKey) {
                console.warn('[AI] openai: API key not set — skipping');
                return null;
            }
            result = await callOpenAI(siteContext, model, apiKey);

        } else if (AI_PROVIDER === 'ollama') {
            result = await callOllama(siteContext, model);

        } else {
            console.warn(`[AI] Unknown provider "${AI_PROVIDER}" — skipping`);
            return null;
        }

        if (!result.ok) {
            console.warn('[AI] Response validation failed:', result.errors.join(' | '));
            // Partial-valid: if we got some elements, log warnings but still return
            if (result.plan?.proposedElements?.length > 0) {
                console.log('[AI] Partial plan accepted with validation warnings');
                return result.plan;
            }
            return null;
        }

        if (result.errors.length > 0) {
            console.warn('[AI] Validation warnings (non-fatal):', result.errors.join(' | '));
        }

        console.log(`[AI] Success — ${result.plan.proposedElements.length} elements`);
        return result.plan;

    } catch (err) {
        console.error(`[AI] ${AI_PROVIDER} call failed: ${err.message}`);
        return null;
    }
}

// ── Legacy export (kept for backward-compat if anything still imports it) ──────
// The old generatePermaculturePlan() wrapped mock + AI together.
// New code in the controller handles that logic directly.
export { generatePermaculturePlanWithAI as generatePermaculturePlan };
