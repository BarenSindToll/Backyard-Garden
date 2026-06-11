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
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { CATALOG_KEY_SET, VALID_ACTIONS, getCatalogForAI } from '../utils/structureCatalogUtils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));


// ── Configuration (read once at startup) ─────────────────────────────────────

const AI_ENABLED = process.env.AI_ENABLED === 'true';
const AI_PROVIDER = (process.env.AI_PROVIDER || 'anthropic').toLowerCase().trim();
const AI_MODEL = (process.env.AI_MODEL || '').trim();
const AI_API_KEY = (process.env.AI_API_KEY || '').trim();
const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');

// When AI is enabled and makes a provider call, allow mock fallback only if explicitly opt-in.
// Default false — a paid AI response that fails validation returns an error, not a silent mock.
const ALLOW_AI_MOCK_FALLBACK = process.env.ALLOW_AI_MOCK_FALLBACK === 'true';

// Maximum tokens to request from the provider
const MAX_OUTPUT_TOKENS = 12000;

// Hard cap on proposed elements returned in a single draft (keeps JSON within token budget)
const MAX_AI_PROPOSED_ELEMENTS = 10;

// Maximum characters for per-element reason fields (keeps JSON small)
const MAX_REASON_CHARS    = 200;
const MAX_STRATEGY_CHARS  = 120;

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

const SYSTEM_PROMPT = `You are a certified professional permaculture garden designer with 20 years of experience in temperate-climate design — specialising in Romania and Eastern Europe. You apply the twelve Holmgren design principles rigorously and have deep knowledge of zones and sectors analysis, companion planting, guild design, water harvesting, no-dig soil building, and sustainable land management.

YOUR TASK
Generate a complete, rich, site-specific permaculture plan for the garden described in the user message.
Your response must be ONLY a single valid JSON object — no markdown fences, no explanations, no comments, no text before or after the JSON.

STRUCTURE SOURCES (critically important — you have exactly two):
1. existingMapStructures — real objects already placed on the garden map. Each has an "id".
2. availableStructureCatalog — objects that MAY be newly created. Each has a "catalogKey".

HARD RULES — follow these without exception:
R1.  Always check existingMapStructures first before proposing any structure.
R2.  If a suitable existing structure is present, enhance it or plant inside it — do NOT create a duplicate.
R3.  Never create a new pond if a pond already exists. Propose pond-edge planting instead.
R4.  Never create a new raised bed if suitable raised beds already exist, unless the user explicitly asked for more.
R5.  Never create a new compost system if compost already exists.
R6.  Never create a new greenhouse if a greenhouse already exists.
R7.  Only use action=create_new when: (a) no suitable existing structure exists AND (b) the canonicalType exists in availableStructureCatalog with canCreateNew=true.
R8.  Never invent a structure type that is not present in availableStructureCatalog.
R9.  If you cannot place something as create_new or enhance_existing, use action=recommendation_only.
R10. Use targetElementId (matching an id from existingMapStructures) when recommending changes to an existing structure.
R11. Use catalogKey (from availableStructureCatalog) when proposing a new structure.
R12. Every proposed element's reason MUST cite at least one of: (a) a site analysis fact, (b) an existing map structure by name, (c) a selected crop or animal from USER REQUIREMENTS, (d) an explicit user goal, or (e) a permaculture zone principle (Zone 1/2/3/4/5). Reasons without a source are not acceptable.
R13. Never generate any path, walkway, road, trail, or access route element. catalogKey="path" is forbidden. Users add paths manually — do not count paths in your element total.
R14. Use ONLY these exact catalogKey values for create_new elements that appear on the General Map. Do not invent new catalog keys:
     vegetable_garden | herb_garden | greenhouse | orchard | guild | berry_patch | food_forest |
     pond | compost | coop | beehive | shed | house | wild_zone | patio | windbreak | swale
R15. Never create two elements that serve the same functional purpose. Each functional role appears at most ONCE:
     • ONE compost element (do not add both "Compost" and "Compost Hub")
     • ONE pond element (do not add both "Duck Pond" and "Wildlife Pond")
     • ONE coop element; ONE greenhouse; ONE shed/workshop
     Exception — multiple instances are allowed for: guild, orchard, berry_patch, pond (only if user explicitly requests it), vegetable_garden (only if user explicitly requests multiple growing areas)
R16. Use short, clean names only. Never use verbose AI-generated names:
     ✓ "Compost" — ✗ "Strategic Composting Hub" or "Integrated Composting Node"
     ✓ "Pond" — ✗ "Wildlife Biodiversity Pond Feature"
     ✓ "Vegetable Garden" — ✗ "Comprehensive Annual Kitchen Garden System"
     ✓ "Beehives" — ✗ "Apiary Pollination Station"
     ✓ "Herb Garden" — ✗ "Culinary Herb Production Zone"
     Keep names under 25 characters. Use the catalog's displayName as your reference.
R17. "type" must be "structure" for every create_new / enhance_existing / plant_inside_existing /
     add_near_existing element — including garden zones (vegetable_garden, herb_garden, orchard,
     berry_patch, guild, food_forest, wild_zone, staple_crops, greenhouse, pond). These ARE real,
     applyable map elements and count toward the element totals in E1–E5.
     "type": "permaculture-zone" is RESERVED for the conceptual Zone 0–5 overlay only — that overlay
     has action="recommendation_only", no catalogKey, and is never placed on the map. Do not use
     "permaculture-zone" for any other element.
R18. Garden zones (vegetable_garden, herb_garden, orchard, berry_patch, guild, greenhouse,
     food_forest, staple_crops, pond) must each be a complete, openable element — never an empty
     placeholder. Each must include a populated detailPlan (and internalBeds where applicable, see
     VG6) so its zone tab is fully usable immediately after apply.

SITE ANALYSIS AUTHORITY:
A1. The SITE ANALYSIS SUMMARY section contains authoritative facts provided by the user. Use every fact listed under "Used facts" when it influences placement or reasoning.
A2. When a site analysis fact directly influences an element's position, explicitly mention it in that element's reason field.
A3. When a field is listed under "Missing facts", do NOT guess or invent a value. Write "placement estimated — [field] data not provided" in the element's warnings[].
A4. When a field is listed under "Confidence impact", reduce confidence accordingly and note it in warnings[].
A5. Always act on every "Placement implication" listed — each one must influence at least one proposed element.

ELEMENT COUNT REQUIREMENTS (actionable elements = create_new + enhance_existing + plant_inside + add_near):
E1. Garden < 200 m²: generate 5–8 actionable elements.
E2. Garden 200–1000 m²: generate 8–14 actionable elements.
E3. Garden 1000 m²+: generate 12–20 actionable elements.
E4. recommendation_only elements do NOT count toward these totals. Add as many as useful but they are supplementary.
E5. If you have fewer actionable elements than the minimum, add more useful structures from the catalog.

GENERAL MAP PRINCIPLE (critical):
G1. The General Map shows major permaculture elements and zones, NOT individual random plants.
G2. Individual crops and plant lists go into the detailPlan.suggestedPlants of their parent element.
G3. Never propose a create_new element whose purpose is to place a single named crop (e.g. "Tomato bed", "Basil planting"). Instead, create a structural element (raised_bed, herb_garden) and list crops in its detailPlan.
G4. The plants[] field at element level is for notable guild companions (comfrey, yarrow, marigold) — not a crop inventory.
G5. Every productive zone element (vegetable_garden, herb_garden, greenhouse, orchard, guild, berry_patch) MUST include a detailPlan with layoutType and at least 3–6 suggestedPlants appropriate to Romania AND an internalBeds array (see VG4–VG5 for schema). These zone tabs are populated directly from your output — do not leave them empty.

ROMANIA / EASTERN EUROPE DEFAULTS:
C1. Default to Romanian-adapted species: apple (Ionatan, Jonathan), plum (Italian prune, Stanley), pear (Williams), cherry (Morello, Kordia), comfrey (Bocking 14), elderflower, hawthorn, blackthorn, clover, yarrow.
C2. Herbs: dill, lovage, parsley, basil, thyme, summer savory — these are staples of Romanian gardens.
C3. Vegetables: tomato (greenhouse or protected), pepper (greenhouse), eggplant, cucumber, zucchini, bean, pea, potato, carrot, cabbage, onion, garlic.
C4. Use hardiness zone 5b–7b as default if no zone provided.
C5. Romanian preservation staples: tomatoes and peppers for zacuscă/sauce, cucumbers and cabbage for pickles/fermentation, potatoes/onions/garlic/squash/apples for winter storage.

HOUSEHOLD FOOD SCALING:
H1. Use household size to scale the number of beds, greenhouse use, orchard size, and crop diversity.
H2. Do NOT promise full self-sufficiency unless both area and change level make it plausible — state explicitly when coverage is limited by space.
H3. If coverage goal is "maximum" but area is under 300 m², explain the constraint and pivot to high-yield intensive strategies.
H4. Every food-production element reason should state which household need it addresses:
     "fresh eating" | "children snacks" | "tomato sauce / canning" | "winter storage" | "herb supply" | "fermentation / pickles" | "animal feed / manure loop" | "low-maintenance perennial yield"
H5. If preservation is selected: prioritise crops for that goal — tomatoes (greenhouse), peppers, cucumbers, cabbage, berries for canning; potatoes, onions, garlic, squash, apples for winter storage; dill, parsley, chamomile for drying.
H6. If winterStorage is selected: include a potato/root crop area and at least one apple/plum tree even in small gardens.

VARIANT RULES — TWO COMPLEMENTARY SPATIAL STRATEGIES:
V1. Variant A — SOLAR PRIORITY:
     • Reserve the highest-direct-sun areas for demanding crops: tomatoes, peppers, cucumbers, eggplants, greenhouse, main summer annuals.
     • Use partial-shade or lower-sun areas for: carrots, beetroot, lettuce, spinach, cabbage, herbs, currants, lovage, mint.
     • Never place tall structures (shed, coop, trellis, tall trees) south of sun-sensitive productive beds where they would cast significant shade.
     • Put greenhouse/polytunnel where it receives the strongest sun and does not shade nearby beds.
     • Orchard and guilds should account for mature tree shade cast on annual beds.
     • If Site Analysis sun/shade sectors are available, use them explicitly in every placement reason.
     • If sun/shade data is missing, mark all sun-based placements as estimated and note this in warnings[].
V2. Variant B — FLOW & ACCESS:
     • Closest to house / Zone 1 (daily visit): herbs, salad greens, greenhouse, compost, daily harvest beds, tomatoes, and any element used every day.
     • Medium distance / Zone 2: main vegetable beds, beans, cabbage, roots, berry patch, beehives.
     • Farther / Zone 3: orchard, guilds, potatoes, pumpkins, corn, coop (if integrated with orchard), larger perennial systems.
     • Every productive area must be near or connected to a path.
     • Compost must be within reasonable distance of kitchen beds and the house.
     • Paths should minimise total walking distance for the most frequent harvesting routes.
     • Each element reason must explain how its position reduces daily work or improves access.
V3. Both variants use the SAME site analysis facts, household needs, crop selections, and animal preferences. They differ ONLY in spatial placement strategy.
V4. Do NOT generate the same element twice at the same position in both variants. Variant B places the same productive elements as Variant A, but uses house proximity as the primary placement criterion instead of sun exposure.
V5. Water & Gravity strategy (optional): only apply if Site Analysis includes slope direction AND a low point or water flow description. When applicable, place swales on contour, pond at the lowest point, drought-tolerant crops higher up, and water-demanding plants in lower or moister areas.

REQUIRED OUTPUT SCHEMA:
{
  "summary": "<3-5 sentence executive summary mentioning key site facts used>",
  "siteAnalysis": {
    "climate": "<climate description>",
    "existingStructures": ["<name>"],
    "constraints": ["<sentence citing source>"],
    "opportunities": ["<sentence citing source>"],
    "waterStrategy": "<approach citing site data>",
    "soilStrategy": "<approach citing site data>",
    "accessStrategy": "<approach>",
    "biodiversityStrategy": "<approach>"
  },
  "proposedElements": [
    {
      "action": "create_new",
      "catalogKey": "<key from availableStructureCatalog>",
      "canonicalType": "<same as catalogKey>",
      "type": "<structure | water-feature>",
      "name": "<descriptive name>",
      "permacultureZone": <integer 0-5>,
      "targetZone": "<0-5>",
      "x": <metres>, "y": <metres>, "width": <metres>, "height": <metres>,
      "rotation": 0,
      "plants": ["<guild companion only — not crop inventory>"],
      "placementRules": ["<rule from PLACEMENT_RULES>"],
      "reason": "<REQUIRED: cite site analysis fact, crop selection, animal, user goal, or zone principle>",
      "variantStrategy": "<solar-priority | flow-access | water-gravity>",
      "strategyReason": "<1-sentence: how strategy influenced placement>",
      "strategyTags": ["<full-sun | partial-shade | daily-harvest | near-house | zone-1 | zone-2 | zone-3 | path-access>"],
      "confidence": 0.8,
      "warnings": [],
      "internalBeds": [
        {
          "id": "bed-1",
          "label": "Tomatoes & Basil",
          "x": 0, "y": 0, "widthM": 14, "heightM": 1.2,
          "plants": ["Tomato (Roma)", "Basil", "Marigold"],
          "spacingCm": 45
        }
      ],
      "detailPlan": {
        "layoutType": "rows | blocks | trees | guild-layers | berry-rows",
        "suggestedPlants": ["<Romania-adapted crop 1>", "<crop 2>", "<crop 3>"],
        "notes": "<companion planting and seasonal notes>"
      }
    }
  ],
  "plantingRecommendations": ["<actionable sentence per item>"],
  "maintenancePlan": ["<seasonal maintenance sentence>"],
  "warnings": ["<global warning about missing site data or design risk>"],
  "bibliography": ["<full citation>"]
}

DESIGN RULES:
D1. Never place create_new elements on or overlapping stable structures (House, Shed, Fence).
D2. Zone 1 elements must be close to the house anchor point (within ~10 m).
D3. Apply zones & sectors: productive beds face the sunniest side; windbreaks on windward boundary; ponds at lowest/wettest point.
D4. Every orchard or guild element must include a detailPlan with guild layers (canopy, understory, groundcover, dynamic accumulators).
D5. Romania/Eastern Europe default varieties listed in C1–C4 above.
D6. If slope or aspect data is missing, note "placement estimated" in warnings — do not invent slope direction.
D7. All coordinates are in metres. x + width <= gardenWidthM; y + height <= gardenHeightM.
D8. confidence: 0.9–1.0 = well-supported by site data; 0.65–0.85 = estimated; 0.4–0.64 = data-poor.
D9. Include at least Mollison (1988) and Holmgren (2002) in bibliography.
D10. Output nothing except the JSON object.
D11. Never generate a path/walkway/road element (see R13). Use the element count budget for productive zones instead.

FIXED STRUCTURES & ACCESS (CRITICAL):
FX1. Any existingMapStructures entry marked [FIXED] (House, Car Road) must NEVER be moved, resized,
     removed, overlapped, or recreated. Treat its position/size as immutable ground truth.
FX2. House is the Zone 0/1 anchor. Place daily-use elements (greenhouse, herb_garden,
     vegetable_garden, compost) close to it, respecting its minimum clearance.
FX3. Car Road is marked [ACCESS AXIS] — use its position only to reason about ease of access
     (e.g. "near the car road for easy unloading of compost/harvests"). Do NOT generate any new
     path, driveway, or road element, and do NOT treat Car Road as buildable space.
FX4. Maintain at least the stated minimum clearance from House and Car Road for all create_new
     elements — do not place anything overlapping or flush against them.

VEGETABLE GARDEN GROUPING (REQUIRED):
VG1. Never generate multiple standalone raised_bed elements for individual crops (e.g. "Tomato Bed", "Leafy Greens Bed").
VG2. Group ALL vegetable production into exactly ONE element: catalogKey="vegetable_garden", action="create_new", type="structure".
VG3. Size the vegetable_garden element based on available space:
     <200 m²: 8×5m   |   200–500 m²: 12×7m   |   500+ m²: 14×8m or larger.
VG4. BED COUNT — DYNAMICALLY calculated (REQUIRED, do NOT hardcode):
     Use the "Bed target" value from HOUSEHOLD FOOD NEEDS section as your primary guide:
       supplement goal  → 2–3 beds
       partial goal     → 3–5 beds (scale with household size: +1 bed per additional person above 2)
       high goal        → 5–8 beds (scale with household size)
       maximum goal     → 7–12 beds (scale with household size and area)
     Site constraints — REDUCE bed count:
       • Greenhouse already present → subtract 1–2 beds (tomatoes/peppers move indoors; note in reason)
       • Herb garden already present → omit the herb/companion border bed
       • Area < 150 m² → maximum 3 beds regardless of goals
       • Area 150–300 m² → maximum 5 beds
       • Heavily shaded site or poor soil noted → reduce by 1 bed and add to element warnings[]
       • Low maintenance goal or <3h/week → reduce by 1–2 beds
     RULES: minimum 2 beds; maximum 12 beds; NEVER use a fixed number like exactly 4, 5, or 6 in all plans.
VG5. BED CONTENT — assign companion-planting groups to each bed, based on household needs and crops selected:
     Typical groups (use only those relevant to the user's selections):
       • Heat-lovers: Tomato, Basil, Marigold, Pepper (omit if greenhouse handles these)
       • Leafy greens: Lettuce, Spinach, Swiss Chard, Kale, Radish, Arugula
       • Root crops: Carrot, Parsley Root, Beetroot, Onion, Garlic, Celeriac
       • Legumes & dill: Bean, Pea, Dill, Borage (nitrogen-fixing companions)
       • Cucurbits: Zucchini, Pumpkin, Cucumber, Nasturtium (space-hungry, put last)
       • Brassicas: Cabbage, Broccoli, Kohlrabi, Dill (for fermentation/winter storage)
       • Romanian staples: Eggplant, Lovage, Summer Savory (if preservation selected)
       • Companion border: Calendula, Marigold, Yarrow, Chamomile (reduce by omitting if herb garden present)
     Assign 2–5 companion plants per bed. Do NOT list the same plant in multiple beds.
VG6. internalBed schema (REQUIRED for every bed):
     { "id": "bed-1", "label": "Heat-Lovers", "x": 0, "y": 0, "widthM": <zone_width>, "heightM": 1.2,
       "plants": ["Tomato (Roma)", "Basil", "Marigold"], "spacingCm": 45 }
     x = 0 always; y increments by (heightM + 0.3) per bed; widthM = vegetable_garden element width.
VG7. Only include beds for crops the user selected or household needs require. Omit a bed type entirely if not relevant.
VG8. If a Greenhouse element is also present, remove tomatoes/peppers from outdoor beds (they go in greenhouse). State this in element reason.

STRICT OUTPUT FORMAT (CRITICAL — violating these rules will cause a parse error):
F1. Return ONLY valid JSON. The response MUST start with { and end with }.
F2. Do NOT use markdown code fences (no \`\`\`json, no \`\`\`, no backticks around the response).
F3. Do NOT include JavaScript comments, trailing commas, or undefined values anywhere in the JSON.
F4. Every "reason" field must be 200 characters or fewer. Truncate if needed — brevity is required.
F5. Every "strategyReason" field must be 120 characters or fewer.
F6. "summary" must be 400 characters or fewer.
F7. Generate AT MOST 10 proposed elements total (create_new + enhance + plant_inside + add_near combined).
F8. Do NOT repeat site analysis facts inside individual element reason fields — one sentence max per element.
F9. Keep the entire JSON response under 8000 tokens. Omit optional fields if needed to stay within this limit.
F10. "bibliography" must contain at most 3 entries.`;

// ── Context message (same for all providers) ──────────────────────────────────

function buildContextMessage(siteContext) {
    try {
        const gl   = siteContext.gardenLayout || {};
        const lc   = siteContext.locationContext || {};
        const el   = siteContext.existingElements || {};
        const sc   = siteContext.siteCharacteristics || {};
        const ur   = siteContext.userRequirements || {};
        const pc   = siteContext.permacultureContext || {};
        const up   = siteContext.userProfile || {};
        const saSum  = siteContext.siteAnalysisSummary   || null;
        const hhStr  = siteContext.householdFoodStrategy || null;

        // generationRequest is attached to sourceContext by the controller after buildPermacultureContext
        const genReq         = siteContext.generationRequest || {};
        const hn             = genReq.householdNeeds        || null;

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
            ? existingStructures.map(s => {
                const flags = [];
                if (s.fixed)            flags.push('FIXED — never move/overlap/remove');
                if (s.accessAxis)       flags.push('ACCESS AXIS — anchor for access scoring, do not generate paths');
                if (s.noOverlapBufferM) flags.push(`min clearance ${s.noOverlapBufferM}m`);
                return `  • id="${s.id}" name="${s.name}" canonicalType=${s.canonicalType} ` +
                    `pos=(${s.xM ?? '?'},${s.yM ?? '?'})m size=${s.wM ?? '?'}×${s.hM ?? '?'}m ` +
                    `canEnhance=${s.canBeEnhanced} canPlantInside=${s.canContainPlants}` +
                    (flags.length ? ` [${flags.join('; ')}]` : '');
              }).join('\n')
            : '  (none)';

        const catalogLines = catalog.length
            ? catalog.map(c =>
                `  • catalogKey=${c.catalogKey} displayName="${c.displayName}" ` +
                `size=${c.defaultWidthM}×${c.defaultHeightM}m canPlantInside=${c.canContainPlants}`
              ).join('\n')
            : '  (none)';

        const areaM2 = gl.areaM2 ?? ((gl.widthM || 0) * (gl.heightM || 0));
        const elementTarget = areaM2 < 200 ? '5–8' : areaM2 < 1000 ? '8–14' : '12–20';

        return `Generate a permaculture plan for this garden:

DIMENSIONS
  Width: ${gl.widthM ?? '?'} m | Height: ${gl.heightM ?? '?'} m | Area: ${areaM2} m²
  REQUIRED actionable elements for this size: ${elementTarget} (create_new + enhance + plant_inside + add_near combined)

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

${hn || hhStr ? `HOUSEHOLD FOOD NEEDS
${hn?.householdSize ? `  Household: ${hn.householdSize} people${hn.adults ? ` (${hn.adults} adults${hn.children ? `, ${hn.children} children` : ''})` : ''}` : '  Household size: not specified'}
  Coverage goal: ${hn?.foodCoverageGoal || 'supplement'}
${(() => {
    const cats = Object.entries(hn?.foodCategories || {}).filter(([,v]) => v).map(([k]) => k);
    return cats.length ? `  Food categories: ${cats.join(', ')}` : '';
})()}
${(() => {
    const pres = Object.entries(hn?.preservationGoals || {}).filter(([,v]) => v).map(([k]) => k);
    return pres.length ? `  Preservation goals: ${pres.join(', ')}` : '';
})()}
${hn?.dietNotes?.trim() ? `  Diet notes: ${hn.dietNotes.trim()}` : ''}
${hhStr ? `  Strategy realism: ${hhStr.realism} | Intensity: ${hhStr.estimatedIntensity} | Bed target: ${hhStr.bedCountTarget}
${hhStr.recommendations.map(r => `  → ${r}`).join('\n')}
${hhStr.warnings.length ? hhStr.warnings.map(w => `  ! ${w}`).join('\n') : ''}` : ''}

` : ''}${saSum ? `SITE ANALYSIS SUMMARY
  Used facts:
${saSum.usedFacts.length ? saSum.usedFacts.map(f => `    • ${f}`).join('\n') : '    None'}
  Missing facts (use best judgement — do not guess; add warnings for gaps):
${saSum.missingFacts.length ? saSum.missingFacts.map(f => `    – ${f}`).join('\n') : '    None'}
  Confidence impact:
${saSum.confidenceImpact.length ? saSum.confidenceImpact.map(f => `    ! ${f}`).join('\n') : '    None'}
  Placement implications:
${saSum.placementImplications.length ? saSum.placementImplications.map(f => `    → ${f}`).join('\n') : '    None'}

` : ''}USER REQUIREMENTS
  Goals: ${(norm.goals || []).join(', ') || 'Not specified'}
  Task type: ${genReq.taskType || 'full-design'}
  Change level: ${genReq.changeLevel || 'moderate'}
  Style: ${norm.inferredStyle || 'Not specified'}
  Time per week: ${genReq.maintenanceTime || norm.timeCommitment || 'Not specified'}
  Preferred plants: ${(norm.preferredPlants || []).join(', ') || 'Not specified'}
  Avoid: ${(norm.excludedPlants || []).join(', ') || 'None'}
  Problems: ${(norm.inferredProblems || []).join(', ') || 'None'}
  Notes: ${raw.freeText || 'None'}
${(() => {
    const cp = genReq.cropPreferences || {};
    const ap = genReq.animalPreferences || {};
    const al = genReq.allowedAdditions || {};
    const lines = [];
    if (cp.selectedMainCrops?.length)
        lines.push(`  Main crops selected: ${cp.selectedMainCrops.join(', ')}`);
    const activeCropAreas = Object.entries(cp.cropAreas || {}).filter(([,v]) => v).map(([k]) => k);
    if (activeCropAreas.length)
        lines.push(`  Crop areas: ${activeCropAreas.join(', ')}`);
    if (ap.animals?.length) {
        const having  = ap.animals.filter(a => a.status === 'have').map(a => a.type);
        const wanting = ap.animals.filter(a => a.status === 'want' || a.status === 'maybe').map(a => a.type);
        if (having.length)  lines.push(`  Animals on site: ${having.join(', ')}`);
        if (wanting.length) lines.push(`  Animals wanted: ${wanting.join(', ')}`);
        if (ap.manureManagement)  lines.push('  Manure composting: required');
        if (ap.rotationalGrazing) lines.push('  Rotational grazing: planned');
    }
    const allowed = Object.entries(al).filter(([,v]) => v).map(([k]) => k);
    if (allowed.length)
        lines.push(`  Allowed new additions: ${allowed.join(', ')}`);
    const siteAck = genReq.siteAnalysisAcknowledgement || {};
    if (siteAck.missingFields?.length)
        lines.push(`  Site analysis missing: ${siteAck.missingFields.join(', ')} — use best judgement for placement`);
    return lines.join('\n');
})()}

${(() => {
    const nb = siteContext.savedSiteAnalysis?.neighbourhood || siteContext.neighbourhood || null;
    if (!nb) return '';
    const TONE = {
        forest:    'Forest — wind protection, shade, wildlife edge, leaf-litter mulch, mushroom/edge habitat; shade competition near boundary',
        river:     'River/Stream — water access, humidity, biodiversity; flood risk on boundary edge; ideal for pond, wetland, water-demanding plants',
        road:      'Road — buffer zone needed (hedge/fence); avoid food crops near pollution; good for access, parking, storage, ornamental hedgerow',
        buildings: 'Buildings/Structures — shade/wind tunnel risk; heat island in summer; windbreak opportunity; avoid shade-sensitive crops nearby',
        field:     'Crop field — possible pesticide/herbicide drift; windbreak hedge buffer strongly advised on this boundary',
        orchard:   'Orchard — beneficial pollinator corridor; plan guild/hedge connections to extend ecosystem benefit',
        pasture:   'Pasture — manure/compost loop opportunity; livestock pressure on fence; plan robust boundary',
        hedge:     'Windbreak/Hedge — microclimate protected side; integrate with guild planting; wind shadow extends 10× hedge height',
        empty:     'Open/empty — exposed side; wind exposure; consider windbreak planting',
        other:     'Custom boundary feature — see notes',
        unknown:   'Unknown — no boundary data',
    };
    const dirs = ['north','east','south','west'];
    const lines = dirs.map(d => {
        const v = nb[d];
        if (!v || v.type === 'unknown') return `  ${d.charAt(0).toUpperCase()+d.slice(1)}: unknown`;
        const tone = TONE[v.type] || v.type;
        const notePart = v.notes ? ` | note: ${v.notes}` : '';
        return `  ${d.charAt(0).toUpperCase()+d.slice(1)}: ${v.label || v.type} — ${tone}${notePart}`;
    }).join('\n');
    return `NEIGHBOURHOOD CONTEXT (CRITICAL — must influence element placement and reasons)
${lines}

NEIGHBOURHOOD DESIGN RULES:
N1. Forest side: place orchard, guild, wild_zone, berry_patch near that edge (edge effect). Keep sun-hungry crops away from forest shade. Wind-protected from that direction.
N2. River/stream side: place pond at low point near that edge; avoid flood-risk placement of permanent structures; humidity-loving plants (herbs, mint, willows) near water.
N3. Road side: plant hedgerow/windbreak buffer on road boundary; place compost, storage, parking area near road for access; keep food gardens away from road pollution.
N4. Crop field side: plant windbreak hedge on that boundary to intercept pesticide drift; ideally a double row with shrubs and trees.
N5. Pasture side: plan fencing and integrate manure composting into a loop; potential rotational grazing or chicken tractor near pasture edge.
N6. Buildings side: account for shade cast; use heat reflected from walls for heat-loving climbers; avoid fruit trees directly under building overhang.
N7. EVERY proposed element reason MUST acknowledge relevant neighbourhood boundary if within 10m of that boundary.
N8. Forest-edge shade buffer: if a "forest" boundary is present, keep vegetable_garden and
     greenhouse at least 10–15m from that forest edge whenever full-sun space is available
     elsewhere in the garden — forest edges cast shade that reduces yield for sun-hungry crops.
     food_forest, wild_zone, windbreak, and guild elements are well-suited near the forest edge
     and should be placed there instead. berry_patch can tolerate the partial shade of a forest
     edge — if placed there, note the shade tolerance in its reason. orchard may sit near a
     forest edge only if intentional (e.g. extending an existing tree line) and the reason
     explains the trade-off.

`;
})()}VARIANT STRATEGY
  Variant type: ${siteContext.variantType || 'A'}
  Strategy: ${siteContext.variantStrategy || 'solar-priority'}
${siteContext.variantStrategy === 'flow-access'
    ? `  Spatial logic: Optimize placement primarily by visit frequency, harvest frequency, ergonomics, and path access.
  Daily-use elements → Zone 1 (close to house). Regular use → Zone 2. Low-maintenance → Zone 3.
  Add strategyReason to every element explaining how proximity/frequency drove its placement.
  Add strategyTags from: ["daily-harvest","near-house","zone-1","zone-2","zone-3","path-access"]`
    : siteContext.variantStrategy === 'water-gravity'
    ? `  Spatial logic: Optimize placement by slope, water flow, retention, drainage and drought resilience.
  Place water-demanding plants lower. Swales on contour. Drought-tolerant crops higher.
  Add strategyReason to every element explaining how slope/water data drove its placement.
  Add strategyTags from: ["low-point","contour","wet-area","drought-tolerant","slope-aware"]`
    : `  Spatial logic: Optimize placement primarily by sun exposure and shade avoidance.
  Sunniest areas → heat-loving crops + greenhouse. Partial shade → greens, roots, shade-tolerant herbs.
  Never place tall structures where they shade important productive beds.
  Add strategyReason to every element explaining how sun/shade drove its placement.
  Add strategyTags from: ["full-sun","partial-shade","shade-avoidance","sun-estimated"]`}

DESIGN VARIANT: ${siteContext.variantType === 'B'
    ? `B — FLOW & ACCESS (placement optimised for visit frequency and human ergonomics)
  Spatial rule: proximity to house is the PRIMARY placement criterion.
  Zone 1 (≤10 m from house): herbs, salad greens, greenhouse, compost, daily-harvest raised beds, tomatoes, basil.
  Zone 2 (10–25 m): main vegetable beds, roots, beans, cabbage, berry patch, beehives.
  Zone 3 (25 m+): orchard, guilds, potatoes, pumpkins, corn, coop, larger perennial systems.
  Paths: connect every productive zone to the house; minimise daily walking distance.
  Every element reason MUST mention how its position reduces daily work or improves access.
  Include: access path from house to all productive beds; compost close to beds and house.
  Expected elements: raised beds (Zone 1), herb garden (Zone 1), compost (Zone 1-2), path, greenhouse (Zone 1), berry patch (Zone 2), orchard (Zone 3).`
    : `A — SOLAR PRIORITY (placement optimised for sun exposure)
  Spatial rule: sun exposure is the PRIMARY placement criterion.
  Highest-sun spots (face sunniest direction): tomatoes, peppers, cucumbers, eggplants, greenhouse, main summer crops.
  Partial-shade or lower-sun spots: carrots, beetroot, lettuce, spinach, cabbage, herbs, currants, lovage.
  Tall structures (shed, coop, trellis, tall trees) must NOT shade sun-sensitive productive beds.
  Greenhouse: place where it receives maximum sun and does not shade beds.
  Site Analysis sun exposure used: ${siteContext.savedSiteAnalysis?.sectors?.sunnyAreas ? '"' + siteContext.savedSiteAnalysis.sectors.sunnyAreas + '"' : 'not available — placement estimated'}.
  Every element reason MUST mention whether it is placed in a high-sun, partial-shade, or estimated-sun area.
  Expected elements: raised beds (sunniest area), greenhouse (sunniest wall), herb garden, compost, path, berry patch (moderate sun), orchard (accounting for shade cast).`}

ELEMENT SELF-CHECK before outputting:
  1. Count actionable elements. Meeting target of ${elementTarget}?
  2. Every openable element (vegetable_garden, herb_garden, greenhouse, orchard, guild, berry_patch, food_forest, wild_zone, staple_crops, pond) has a detailPlan with suggestedPlants (and internalBeds where applicable)?
  2b. No element has "type": "permaculture-zone" except the conceptual Zone 0–5 overlay (no catalogKey, action=recommendation_only)?
  2c. House and Car Road (if marked [FIXED]) are not overlapped, moved, or recreated by any proposed element?
  3. Every reason cites a source (site fact, existing structure, crop, animal, goal, zone rule)?
  4. No individual crop names as standalone create_new elements?
  5. ${siteContext.variantType === 'B'
        ? 'Every element reason mentions proximity to house or how it reduces daily work? (Variant B requirement)'
        : 'Every element reason mentions sun exposure level (high-sun / partial-shade / estimated)? (Variant A requirement)'}

Output ONLY the JSON object — no markdown, no text outside the JSON.`;
    } catch (err) {
        console.error('[permacultureAiService] buildContextMessage error:', err.message);
        return 'Generate a basic permaculture plan. Output ONLY valid JSON matching the schema.';
    }
}

// ── Debug log writer ─────────────────────────────────────────────────────────
function writeDebugLog(data) {
    try {
        const logsDir = join(__dirname, '..', 'logs');
        mkdirSync(logsDir, { recursive: true });
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filepath = join(logsDir, `ai-failed-${ts}.json.txt`);
        writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`[AI] Debug log written → ${filepath}`);
    } catch (err) {
        console.error('[AI] Failed to write debug log:', err.message);
    }
}

// ── Robust JSON extraction ────────────────────────────────────────────────────
function extractJsonObject(raw) {
    if (!raw || typeof raw !== 'string') throw new Error('Empty AI response');
    let text = raw.trim();
    // Strip markdown fences (single-pass regex handles both opening and closing)
    text = text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim();
    // Find the outermost { ... }
    const first = text.indexOf('{');
    const last  = text.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) {
        throw new Error(`No complete JSON object found (first={${first}} last={${last}})`);
    }
    return text.slice(first, last + 1);
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
    stableStructs         = [],
    catalogKeySet         = CATALOG_KEY_SET,
    existingMapStructures = [],
    { maxTokens = MAX_OUTPUT_TOKENS, outputTokens = 0, provider = '', model = '' } = {}
) {
    const errors = [];

    // ── Extract JSON object from raw text ─────────────────────────────────────
    let text;
    try {
        text = extractJsonObject(rawText || '');
    } catch (extractErr) {
        const likelyTruncated = outputTokens > 0 && outputTokens >= maxTokens * 0.97;
        writeDebugLog({ provider, model, maxTokens, outputTokens, parseError: extractErr.message, rawLength: (rawText || '').length, raw: (rawText || '').slice(0, 2000) });
        return { ok: false, errors: [`JSON extraction failed: ${extractErr.message}`], truncated: likelyTruncated, outputTokens, maxTokens };
    }

    let parsed;
    try { parsed = JSON.parse(text); }
    catch (e) {
        const likelyTruncated = outputTokens > 0 && outputTokens >= maxTokens * 0.97;
        writeDebugLog({ provider, model, maxTokens, outputTokens, parseError: e.message, rawLength: (rawText || '').length, extractedLength: text.length, raw: (rawText || '').slice(0, 2000) });
        return { ok: false, errors: [`JSON parse failed: ${e.message}`], truncated: likelyTruncated, outputTokens, maxTokens };
    }

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

        // permacultureZone: accept integer 0-5; also try parsing targetZone string
        let permacultureZone = el.permacultureZone ?? null;
        if (permacultureZone != null) {
            const pz = Number(permacultureZone);
            permacultureZone = (Number.isInteger(pz) && pz >= 0 && pz <= 5) ? pz : null;
        }
        if (permacultureZone == null && el.targetZone != null) {
            const tz = parseInt(String(el.targetZone), 10);
            if (Number.isInteger(tz) && tz >= 0 && tz <= 5) permacultureZone = tz;
        }

        // detailPlan: accept object, reject primitives
        let detailPlan = (el.detailPlan && typeof el.detailPlan === 'object') ? el.detailPlan : null;
        if (detailPlan) {
            detailPlan = {
                layoutType:      String(detailPlan.layoutType || 'rows'),
                suggestedPlants: Array.isArray(detailPlan.suggestedPlants) ? detailPlan.suggestedPlants.filter(Boolean).map(String) : [],
                notes:           String(detailPlan.notes || '').slice(0, 1000),
                ...(detailPlan.treeLayout ? { treeLayout: detailPlan.treeLayout } : {}),
                ...(detailPlan.layers     ? { layers:     detailPlan.layers     } : {}),
                ...(detailPlan.rows       ? { rows:       detailPlan.rows       } : {}),
                ...(detailPlan.blocks     ? { blocks:     detailPlan.blocks     } : {}),
            };
        }

        const normalised = {
            action,
            catalogKey:       el.catalogKey      ? String(el.catalogKey).slice(0, 50)      : undefined,
            targetElementId:  el.targetElementId ? String(el.targetElementId).slice(0, 100) : undefined,
            enhancementType:  el.enhancementType ? String(el.enhancementType).slice(0, 80)  : undefined,
            canonicalType:    el.canonicalType   ? String(el.canonicalType).slice(0, 50)    : (el.catalogKey || 'unknown'),
            type:             VALID_TYPES.has(el.type) ? el.type : 'structure',
            name:             String(el.name || 'Unnamed').slice(0, 120),
            permacultureZone,
            targetZone:       String(el.targetZone ?? '').slice(0, 5),
            x, y,
            width:    w,
            height:   h,
            rotation: Number.isFinite(Number(el.rotation)) ? Math.round(Number(el.rotation)) : 0,
            plants:         toStringArray(el.plants),
            placementRules: Array.isArray(el.placementRules)
                ? el.placementRules.filter(r => typeof r === 'string').slice(0, 20)
                : [],
            reason:         String(el.reason || '').slice(0, MAX_REASON_CHARS),
            variantStrategy: el.variantStrategy ? String(el.variantStrategy).slice(0, 30) : undefined,
            strategyReason:  el.strategyReason  ? String(el.strategyReason).slice(0, MAX_STRATEGY_CHARS) : undefined,
            strategyTags:    Array.isArray(el.strategyTags) ? el.strategyTags.filter(t => typeof t === 'string').slice(0, 10) : undefined,
            confidence: clamp(isNaN(Number(el.confidence)) ? 0.8 : Number(el.confidence), 0, 1),
            warnings:   elWarnings,
            detailPlan,
            // internalBeds: normalize and preserve for vegetable_garden zone portals
            internalBeds: Array.isArray(el.internalBeds) ? el.internalBeds.slice(0, 8).map((b, i) => ({
                id:       String(b.id || `bed-${i + 1}`),
                label:    String(b.label || '').slice(0, 80),
                x:        Number(b.x) || 0,
                y:        Number(b.y) || 0,
                widthM:   Math.max(0.5, Number(b.widthM) || 2),
                heightM:  Math.max(0.3, Number(b.heightM) || 1),
                plants:   Array.isArray(b.plants) ? b.plants.filter(Boolean).map(String).slice(0, 8) : [],
                spacingCm: Number(b.spacingCm) || 40,
            })) : undefined,
        };

        // Remove undefined/null keys for cleanliness
        for (const k of ['catalogKey', 'targetElementId', 'enhancementType', 'detailPlan', 'variantStrategy', 'strategyReason', 'strategyTags', 'internalBeds']) {
            if (normalised[k] === undefined || normalised[k] === null) delete normalised[k];
        }

        plan.proposedElements.push(normalised);
    }

    // ── Cap total elements to prevent token-limit issues ─────────────────────
    if (plan.proposedElements.length > MAX_AI_PROPOSED_ELEMENTS) {
        console.log(`[parseAndValidate] Capping elements from ${plan.proposedElements.length} → ${MAX_AI_PROPOSED_ELEMENTS}`);
        plan.proposedElements = plan.proposedElements.slice(0, MAX_AI_PROPOSED_ELEMENTS);
    }

    // ── Deduplicate element names ─────────────────────────────────────────────
    const seenNames = new Map();
    for (const el of plan.proposedElements) {
        const orig = el.name || 'Unnamed';
        const count = (seenNames.get(orig) || 0) + 1;
        seenNames.set(orig, count);
        if (count > 1) el.name = `${orig} ${count}`;
    }

    if (plan.bibliography.length === 0) {
        plan.bibliography = [
            "Mollison, B. (1988). Permaculture: A Designers' Manual. Tagari Publications.",
            "Holmgren, D. (2002). Permaculture: Principles and Pathways Beyond Sustainability.",
        ];
    }
    // Cap bibliography to 3 entries
    plan.bibliography = plan.bibliography.slice(0, 3);

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
        max_tokens: MAX_OUTPUT_TOKENS,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: buildContextMessage(siteContext) }],
    });

    const outputTokens = response.usage?.output_tokens ?? 0;
    const raw = response.content.filter(c => c.type === 'text').map(c => c.text).join('');
    console.log(`[AI/anthropic] model=${model} max_tokens=${MAX_OUTPUT_TOKENS} in=${response.usage?.input_tokens} out=${outputTokens} cached=${response.usage?.cache_read_input_tokens ?? 0} rawChars=${raw.length}`);
    return parseAndValidate(raw, gardenW, gardenH, stables, catKeys, existing, { maxTokens: MAX_OUTPUT_TOKENS, outputTokens, provider: 'anthropic', model });
}

// ── Provider: OpenAI ──────────────────────────────────────────────────────────

async function callOpenAI(siteContext, model, apiKey) {
    const client = new OpenAI({ apiKey });
    const { gardenW, gardenH, stables, catKeys, existing } = extractParseArgs(siteContext);

    const response = await client.chat.completions.create({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildContextMessage(siteContext) },
        ],
    });

    const raw = response.choices[0]?.message?.content || '';
    const usage = response.usage || {};
    const outputTokens = usage.completion_tokens ?? 0;
    console.log(`[AI/openai] model=${model} max_tokens=${MAX_OUTPUT_TOKENS} in=${usage.prompt_tokens} out=${outputTokens} rawChars=${raw.length}`);
    return parseAndValidate(raw, gardenW, gardenH, stables, catKeys, existing, { maxTokens: MAX_OUTPUT_TOKENS, outputTokens, provider: 'openai', model });
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
    return parseAndValidate(raw, gardenW, gardenH, stables, catKeys, existing, { provider: 'ollama', model });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a permaculture plan using the configured AI provider.
 *
 * Returns:
 *   { plan }               — on success
 *   { plan: null }         — when AI is disabled (caller may mock-fallback)
 *   { plan: null, error, truncated, aiWasCalled } — when AI was called but failed
 *
 * ALLOW_AI_MOCK_FALLBACK controls whether the controller may silently fall back
 * to mock generation when AI was called and failed (default: false).
 *
 * @param {object} siteContext – output of buildPermacultureContext()
 * @returns {Promise<{ plan: object|null, error?: string, truncated?: boolean, aiWasCalled?: boolean }>}
 */
export async function generatePermaculturePlanWithAI(siteContext) {
    if (!AI_ENABLED) {
        console.log('[AI] AI_ENABLED is not "true" — skipping AI call');
        return { plan: null };
    }

    const model  = effectiveModel();
    const apiKey = resolveKey(AI_PROVIDER);

    console.log(`[AI] provider=${AI_PROVIDER} model=${model} max_tokens=${MAX_OUTPUT_TOKENS} ALLOW_MOCK_FALLBACK=${ALLOW_AI_MOCK_FALLBACK}`);

    try {
        let result;

        if (AI_PROVIDER === 'anthropic') {
            if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
                console.warn('[AI] anthropic: API key not set — skipping (mock allowed)');
                return { plan: null };
            }
            result = await callAnthropic(siteContext, model, apiKey);

        } else if (AI_PROVIDER === 'openai') {
            if (!apiKey) {
                console.warn('[AI] openai: API key not set — skipping (mock allowed)');
                return { plan: null };
            }
            result = await callOpenAI(siteContext, model, apiKey);

        } else if (AI_PROVIDER === 'ollama') {
            result = await callOllama(siteContext, model);

        } else {
            console.warn(`[AI] Unknown provider "${AI_PROVIDER}" — skipping`);
            return { plan: null };
        }

        if (!result.ok) {
            const truncated = result.truncated || false;
            console.warn(`[AI] Response validation failed (truncated=${truncated}):`, result.errors.join(' | '));

            // Partial-valid: got some elements despite validation warnings
            if (result.plan?.proposedElements?.length > 0) {
                console.log('[AI] Partial plan accepted with validation warnings');
                return { plan: result.plan };
            }

            // No usable plan — decide whether to allow mock fallback
            if (!ALLOW_AI_MOCK_FALLBACK) {
                const errMsg = truncated
                    ? `AI response was likely truncated (${result.outputTokens}/${result.maxTokens} tokens). Retry or increase MAX_OUTPUT_TOKENS.`
                    : `AI response failed validation: ${result.errors.slice(0, 2).join('; ')}`;
                return { plan: null, error: errMsg, truncated, aiWasCalled: true };
            }

            console.warn('[AI] ALLOW_AI_MOCK_FALLBACK=true — allowing mock fallback after AI failure');
            return { plan: null };
        }

        if (result.errors.length > 0) {
            console.warn('[AI] Validation warnings (non-fatal):', result.errors.join(' | '));
        }

        console.log(`[AI] Success — ${result.plan.proposedElements.length} elements`);
        return { plan: result.plan };

    } catch (err) {
        console.error(`[AI] ${AI_PROVIDER} call failed: ${err.message}`);
        // Network/auth errors — mock fallback is generally safe here
        return { plan: null, error: `AI provider call failed: ${err.message}`, aiWasCalled: true };
    }
}

// ── Legacy export (kept for backward-compat if anything still imports it) ──────
// The old generatePermaculturePlan() wrapped mock + AI together.
// New code in the controller handles that logic directly.
export { generatePermaculturePlanWithAI as generatePermaculturePlan };
