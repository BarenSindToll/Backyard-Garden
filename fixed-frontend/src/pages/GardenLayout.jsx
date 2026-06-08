import { useEffect, useMemo, useRef, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { apiUrl } from '../utils/api';
import 'react-toastify/dist/ReactToastify.css';
import DashboardHeader from '../components/DashboardHeader';
import GardenCanvas from '../components/garden-layout/GardenCanvas';
import PlantSidebar from '../components/garden-layout/PlantSidebar';
import SetupPanel from '../components/garden-layout/SetupPanel';
import GuildHealthBar from '../components/garden-layout/GuildHealthBar';
import BedSidebar from '../components/garden-layout/BedSidebar';
import PermaculturePlanWizard from '../components/permaculture/PermaculturePlanWizard';
import PermaculturePlanSidePreview from '../components/permaculture/PermaculturePlanSidePreview';
import SiteAnalysisWizard from '../components/garden-layout/SiteAnalysisWizard';
import { STRUCTURES, GENERAL_STRUCTURES_MAP, LEGACY_NAME_TO_KEY } from '../components/garden-layout/gardenZoneConfig';
import { fetchCurrentUser } from '../utils/fetchCurrentUser';
import { useLanguage } from '../utils/languageContext';

const DEFAULT_SETUP = {
    gardenName: 'My Garden',
    widthM: 100,
    heightM: 60,
    country: '',
    hardinessZone: '7b',
    climate: 'Temperate',
    cellSizeM: 1,
    focusAreas: [],
    goals: [],
    northDirection: 'top',
};

const STRUCTURE_MAP = Object.fromEntries(STRUCTURES.map(s => [s.name, s]));

const createEmptyGrid = (rows = 10, cols = 10) =>
    Array.from({ length: rows }, () => Array(cols).fill(null));

const enrichGrid = (grid, plants) =>
    grid.map(row =>
        row.map(cell => {
            if (!cell) return null;
            const name = typeof cell === 'string' ? cell : cell.plant;
            if (!name) return null;
            const base = typeof cell === 'object' ? cell : { plant: name };
            if (base.isStructure || STRUCTURE_MAP[name]) {
                const def = STRUCTURE_MAP[name];
                return { ...base, plant: name, isStructure: true, iconData: def?.icon ?? base.iconData, structureColor: def?.color ?? base.structureColor };
            }
            const matched = plants.find(p => p.name === name);
            return { ...base, plant: name, iconData: matched?.iconData ?? base.iconData };
        })
    );

const cleanForSave = (grids) =>
    grids.map(grid =>
        grid.map(row =>
            row.map(cell => {
                if (!cell) return null;
                const { iconData, structureColor, ...rest } = cell;
                return rest;
            })
        )
    );

const defaultPositions = (count) =>
    Array.from({ length: count }, (_, i) => ({
        x: 200 + (i % 4) * 180,
        y: 120 + Math.floor(i / 4) * 160,
        inGeneral: false,
        shape: 'circle',
    }));

// ── Reset confirmation dialog ─────────────────────────────────────────────────
function ResetConfirmDialog({ confirm, onCancel, onConfirm }) {
    if (!confirm) return null;
    const isGeneral = confirm.type === 'general';
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
             onClick={e => e.target === e.currentTarget && onCancel()}>
            <div className="bg-paper rounded-2xl shadow-xl border border-line w-full max-w-sm p-6">
                <h2 className="font-display font-medium text-ink text-base mb-2">
                    {isGeneral ? 'Reset General Map?' : `Reset "${confirm.name}"?`}
                </h2>
                <p className="text-sm text-ink-soft leading-relaxed mb-5">
                    {isGeneral
                        ? 'This will remove all elements from the General Map. Your other zones will remain.'
                        : 'This will remove all elements from this zone, but the zone itself will remain.'}
                </p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel}
                        className="px-4 py-2 text-sm text-ink-soft border border-line rounded-xl hover:bg-cream/60 transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm}
                        className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 font-medium transition-colors">
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
}

function ResetAllConfirmDialog({ open, onCancel, onConfirm }) {
    const [typed, setTyped] = useState('');
    if (!open) return null;
    const ready = typed.trim() === 'RESET';
    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(16,22,18,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 24 }}
            onClick={e => e.target === e.currentTarget && onCancel()}
        >
            <div style={{ background: '#fbf7ea', borderRadius: 14, width: '100%', maxWidth: 420, padding: 28, boxShadow: '0 20px 60px rgba(20,30,25,0.35)', border: '1px solid #d3cdb8' }}>
                <h2 style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 20, fontWeight: 500, color: '#1d2a20', margin: '0 0 10px', lineHeight: 1.2 }}>
                    Reset entire garden layout?
                </h2>
                <p style={{ fontSize: 13, color: '#485547', lineHeight: 1.55, margin: '0 0 10px' }}>
                    This will remove all elements from the General Map, delete all zones, clear all beds, plants, paths, structures, and AI preview items.
                </p>
                <p style={{ fontSize: 13, color: '#485547', lineHeight: 1.55, margin: '0 0 20px' }}>
                    <strong style={{ color: '#1d2a20' }}>Kept:</strong> garden size, location, hardiness zone, site analysis, and favourite plants.
                </p>
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10.5, color: '#7c857a', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Type <strong style={{ color: '#b45309' }}>RESET</strong> to confirm
                    </div>
                    <input
                        autoFocus
                        type="text"
                        value={typed}
                        onChange={e => setTyped(e.target.value)}
                        placeholder="RESET"
                        style={{ width: '100%', padding: '9px 12px', border: `1px solid ${ready ? '#b45309' : '#d3cdb8'}`, borderRadius: 6, fontSize: 13.5, fontFamily: 'inherit', background: '#fbf7ea', color: '#1d2a20', outline: 'none', boxSizing: 'border-box', letterSpacing: '0.05em', transition: 'border-color 0.12s' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{ padding: '8px 16px', fontSize: 13, color: '#485547', border: '1px solid #d3cdb8', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}
                    >Cancel</button>
                    <button
                        onClick={onConfirm}
                        disabled={!ready}
                        style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, color: ready ? '#fff' : '#9ca3af', background: ready ? '#dc2626' : '#f3f4f6', border: 'none', borderRadius: 6, cursor: ready ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.12s' }}
                    >Reset everything</button>
                </div>
            </div>
        </div>
    );
}

// Import useState for the dialog — it uses parent's useState via props so no extra import needed.

export default function GardenLayout() {
    const { t } = useLanguage();
    const g = t.garden;

    // ── Core layout state ─────────────────────────────────────────────────────
    const [setup, setSetup] = useState(DEFAULT_SETUP);
    const [zones, setZones] = useState(['Zone 1']);
    const [currentZone, setCurrentZone] = useState(-1);
    const [grids, setGrids] = useState([createEmptyGrid()]);
    const [positions, setPositions] = useState(defaultPositions(1));
    const [userId, setUserId] = useState(null);
    const [allPlants, setAllPlants] = useState([]);
    const [overlayItems, setOverlayItems] = useState([]);
    const [favoritePlants, setFavoritePlants] = useState([]);
    const [bedLayouts, setBedLayouts] = useState({});
    const [zoneItems, setZoneItems] = useState({});

    // ── Bed selection state ───────────────────────────────────────────────────
    const [selectedBedId, setSelectedBedId] = useState(null);
    const [selectedBedElementId, setSelectedBedElementId] = useState(null);
    const [selectedBedZone, setSelectedBedZone] = useState(null);

    // ── Zone reset state ─────────────────────────────────────────────────────
    const [resetConfirm, setResetConfirm] = useState(null); // null | { type, index, name }
    const [resetAllOpen, setResetAllOpen]  = useState(false); // full-layout reset dialog
    const undoSnapshotRef = useRef(null);                    // snapshot for one-level undo

    // ── Site analysis state ───────────────────────────────────────────────────
    const [siteAnalysis, setSiteAnalysis] = useState(null);
    const [siteAnalysisOpen, setSiteAnalysisOpen] = useState(false);

    // ── Permaculture wizard state ─────────────────────────────────────────────
    const [generatePlanOpen, setGeneratePlanOpen] = useState(false);
    const [wizardInitialStep, setWizardInitialStep] = useState(1);

    // ── Permaculture preview state (side panel + map overlay) ─────────────────
    const [permPlanDraft, setPermPlanDraft] = useState(null);           // active plan (shown on map + panel)
    const [permPlanVariants, setPermPlanVariants] = useState([]);        // [planA, planB] when two variants generated
    const [activeVariantIndex, setActiveVariantIndex] = useState(0);    // which variant is displayed
    const [previewSelectedNames, setPreviewSelectedNames] = useState(null); // null = all selected
    const [hoveredPreviewName, setHoveredPreviewName] = useState(null);
    const [previewHidden, setPreviewHidden] = useState(false);

    // ── Re-layout: reflow selected proposed elements to avoid overlaps ─────────
    // When elements are deselected the remaining selected elements are repacked
    // so they don't overlap each other. Purely visual — stored plan is unchanged.
    const displayProposedElements = useMemo(() => {
        const elements = permPlanDraft?.proposedElements;
        if (!elements?.length) return [];
        if (previewHidden) return [];

        const gW              = setup?.widthM  || 20;
        const gH              = setup?.heightM || 20;
        const variantStrategy = permPlanDraft?.sourceContext?.variantStrategy || 'solar-priority';
        const isFlowAccess    = variantStrategy === 'flow-access';

        // Detect whether any path element was deselected (affects Flow & Access warning)
        const selectedSet    = previewSelectedNames;
        const pathDeselected = isFlowAccess && elements.some(
            el => el.canonicalType === 'path' && selectedSet !== null && !selectedSet.has(el.name)
        );

        // Strategy-aware ordering: for flow-access, process Zone 1 elements first so they
        // win any overlap resolution. For solar-priority, preserve AI generation order.
        const ordered = isFlowAccess
            ? [...elements].sort((a, b) => (a.permacultureZone ?? 5) - (b.permacultureZone ?? 5))
            : elements;

        const placed = [];
        return ordered.map(el => {
            const isSelected = previewSelectedNames === null || previewSelectedNames.has(el.name);
            // Non-map or deselected: pass through as-is (overlay handles opacity)
            if (!isSelected || el.action === 'recommendation_only' || el.type === 'permaculture-zone') {
                return el;
            }

            const w = Math.max(0.1, el.width  || 2);
            const h = Math.max(0.1, el.height || 2);
            let x  = Math.max(0, Math.min(gW - w, el.x || 0));
            let y  = Math.max(0, Math.min(gH - h, el.y || 0));

            const overlaps = (cx, cy) => placed.some(p =>
                cx < p.x + p.w + 0.2 && cx + w > p.x - 0.2 &&
                cy < p.y + p.h + 0.2 && cy + h > p.y - 0.2
            );

            if (overlaps(x, y)) {
                const shifts = [
                    [0, h + 0.5], [0, -(h + 0.5)], [w + 0.5, 0], [-(w + 0.5), 0],
                    [0, h + 1.5], [0, -(h + 1.5)], [w + 1.5, 0], [-(w + 1.5), 0],
                    [w + 0.5, h + 0.5], [-(w + 0.5), h + 0.5],
                ];
                for (const [dx, dy] of shifts) {
                    const nx = Math.max(0, Math.min(gW - w, x + dx));
                    const ny = Math.max(0, Math.min(gH - h, y + dy));
                    if (!overlaps(nx, ny)) { x = nx; y = ny; break; }
                }
            }

            placed.push({ x, y, w, h });

            // Flow & Access: add warning on elements that relied on a now-deselected path
            const extraWarnings = (isFlowAccess && pathDeselected &&
                el.canonicalType !== 'path' && (el.permacultureZone ?? 5) >= 2)
                ? ['This element may be harder to access because the related path was deselected.']
                : [];

            const base = (x === el.x && y === el.y) ? el : { ...el, x, y };
            return extraWarnings.length
                ? { ...base, warnings: [...(base.warnings || []), ...extraWarnings] }
                : base;
        });
    }, [permPlanDraft?.proposedElements, permPlanDraft?.sourceContext?.variantStrategy, previewSelectedNames, previewHidden, setup?.widthM, setup?.heightM]);

    // ── Apply state (lifted from wizard, now owned by GardenLayout) ───────────
    const [applying, setApplying] = useState(false);
    const [applyWarning, setApplyWarning] = useState(null);
    const [applyError, setApplyError] = useState('');
    const [skippedElements, setSkippedElements] = useState([]);

    const placedPlantNames = useMemo(
        () => grids.flat(2).map(c => c?.plant).filter(Boolean),
        [grids]
    );

    // ── Save ──────────────────────────────────────────────────────────────────
    const saveToBackend = async (
        gridsToSave, zonesToSave, setupToSave, positionsToSave,
        overlayItemsToSave,
        bedLayoutsToSave = bedLayouts,
        zoneItemsToSave = zoneItems,
        showToast = false,
        siteAnalysisToSave = undefined
    ) => {
        try {
            const body = {
                grids: cleanForSave(gridsToSave),
                zones: zonesToSave,
                setup: setupToSave,
                positions: positionsToSave,
                overlayItems: overlayItemsToSave,
                bedLayouts: bedLayoutsToSave,
                zoneItems: zoneItemsToSave,
            };
            if (siteAnalysisToSave !== undefined) body.siteAnalysis = siteAnalysisToSave;
            const res = await fetch(apiUrl('/api/gardenLayout/save-layout'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok || data.success === false) {
                if (showToast) toast.error('Save failed. Please try again.', { position: 'top-center', autoClose: 3000 });
                return false;
            }
            if (showToast) toast.success(g.layoutSaved, { position: 'top-center', autoClose: 2000 });
            return true;
        } catch {
            if (showToast) toast.error('Save failed. Please try again.', { position: 'top-center', autoClose: 3000 });
            return false;
        }
    };

    // ── Load ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            const user = await fetchCurrentUser();
            if (!user) return;
            setUserId(user._id);
            setFavoritePlants(user.favoritePlants || []);
            try {
                const [plantRes, layoutRes] = await Promise.all([
                    fetch(apiUrl('/api/plants/all'), { credentials: 'include' }),
                    fetch(apiUrl('/api/gardenLayout/load-layout'), { credentials: 'include' }),
                ]);
                const plantData = await plantRes.json();
                const layoutData = await layoutRes.json();
                const plants = plantData.success ? plantData.plants : [];
                setAllPlants(plants);

                if (layoutData.success) {
                    // Respect explicitly-saved empty zones array (e.g. after a full reset).
                    // Only fall back to ['Zone 1'] when the backend has NO saved layout yet.
                    const loadedZones = Array.isArray(layoutData.zones) ? layoutData.zones : ['Zone 1'];
                    const enriched = (layoutData.grids || []).map(g => enrichGrid(g, plants));
                    const loadedGrids = enriched.length ? enriched : [createEmptyGrid()];
                    setZones(loadedZones);
                    setGrids(loadedGrids);
                    setPositions(
                        layoutData.positions?.length === loadedZones.length
                            ? layoutData.positions.map(p => ({ inGeneral: false, shape: 'circle', ...p }))
                            : defaultPositions(loadedZones.length)
                    );
                    const normalizedOverlay = (layoutData.overlayItems || []).map(it => {
                        let norm = it.id != null ? it : { ...it, id: Date.now() + Math.random() };
                        // Upgrade legacy items to new GENERAL_STRUCTURES format when safe
                        if (!norm.structureKey && norm.isStructure && norm.name) {
                            const key = LEGACY_NAME_TO_KEY[norm.name];
                            if (key) {
                                const gsConf = GENERAL_STRUCTURES_MAP[key];
                                norm = {
                                    ...norm,
                                    structureKey: key,
                                    type: norm.type || key,
                                    iconKey: norm.iconKey || gsConf?.iconKey || null,
                                    color: norm.color || gsConf?.color || null,
                                    borderColor: norm.borderColor || gsConf?.borderColor || null,
                                    isZonePortal: norm.isZonePortal ?? (gsConf?.canOpenZone || false),
                                };
                            }
                        }
                        return norm;
                    });
                    if (normalizedOverlay.length) setOverlayItems(normalizedOverlay);
                    if (layoutData.bedLayouts && typeof layoutData.bedLayouts === 'object') setBedLayouts(layoutData.bedLayouts);
                    if (layoutData.zoneItems && typeof layoutData.zoneItems === 'object') setZoneItems(layoutData.zoneItems);
                    if (layoutData.siteAnalysis) setSiteAnalysis(layoutData.siteAnalysis);
                    if (layoutData.setup && Object.keys(layoutData.setup).length > 0) {
                        setSetup({ ...DEFAULT_SETUP, ...layoutData.setup });
                    } else if (user.zone) {
                        setSetup(s => ({ ...s, hardinessZone: user.zone }));
                    }
                } else if (user.zone) {
                    setSetup(s => ({ ...s, hardinessZone: user.zone }));
                }
            } catch (err) { console.error('Load failed:', err); }
        };
        load();
    }, []);

    // ── Zone handlers ─────────────────────────────────────────────────────────
    const handleSetupSave = (newSetup) => {
        setSetup(newSetup);
        if (userId) saveToBackend(grids, zones, newSetup, positions, overlayItems);
    };

    const handleRotateNorth = (dir) => {
        const newSetup = { ...setup, northDirection: dir };
        setSetup(newSetup);
        if (userId) saveToBackend(grids, zones, newSetup, positions, overlayItems);
    };

    const handleAddZone = (zoneName, inGeneral = false, canvasPos = null) => {
        const name = zoneName || `Zone ${zones.length + 1}`;
        const updatedZones = [...zones, name];
        const updatedGrids = [...grids, createEmptyGrid(4, 4)];
        const newIdx = positions.length;
        const newPos = canvasPos
            ? { x: canvasPos.x, y: canvasPos.y, inGeneral: true, shape: 'rect', w: canvasPos.w, h: canvasPos.h }
            : { x: 200 + (newIdx % 4) * 180, y: 120 + Math.floor(newIdx / 4) * 160, inGeneral, shape: 'circle' };
        const updatedPositions = [...positions, newPos];
        setZones(updatedZones); setGrids(updatedGrids); setPositions(updatedPositions);
        setCurrentZone(canvasPos || inGeneral ? -1 : updatedZones.length - 1);
        if (userId) saveToBackend(updatedGrids, updatedZones, setup, updatedPositions, overlayItems);
    };

    const updateGrid = (zoneIndex, newGrid) => {
        const updated = [...grids];
        updated[zoneIndex] = newGrid;
        setGrids(updated);
        if (userId) saveToBackend(updated, zones, setup, positions, overlayItems);
    };

    const handleDeleteZone = (index) => {
        const deletedZoneName = zones[index];
        const updatedZones = zones.filter((_, i) => i !== index);
        const updatedGrids = grids.filter((_, i) => i !== index);
        const updatedPositions = positions.filter((_, i) => i !== index);
        const deletedZoneItems = zoneItems[deletedZoneName] || [];
        const deletedBedIds = new Set(deletedZoneItems.map(it => String(it.id)));
        const updatedZoneItems = { ...zoneItems };
        delete updatedZoneItems[deletedZoneName];
        const updatedBedLayouts = Object.fromEntries(
            Object.entries(bedLayouts).filter(([id]) => !deletedBedIds.has(id))
        );
        setZones(updatedZones); setGrids(updatedGrids); setPositions(updatedPositions);
        setZoneItems(updatedZoneItems); setBedLayouts(updatedBedLayouts);
        if (selectedBedZone === deletedZoneName) { setSelectedBedId(null); setSelectedBedElementId(null); setSelectedBedZone(null); }
        setCurrentZone(prev => {
            if (updatedZones.length === 0 || prev === index) return -1;
            return prev > index ? prev - 1 : prev;
        });
        if (userId) saveToBackend(updatedGrids, updatedZones, setup, updatedPositions, overlayItems, updatedBedLayouts, updatedZoneItems);
    };

    const handleRenameZone = (updatedZones) => {
        setZones(updatedZones);
        if (userId) saveToBackend(grids, updatedZones, setup, positions, overlayItems);
    };

    const handleUpdatePositions = (newPositions) => {
        setPositions(newPositions);
        if (userId) saveToBackend(grids, zones, setup, newPositions, overlayItems);
    };

    const handleFavoritesChange = async (newFavorites) => {
        setFavoritePlants(newFavorites);
        try {
            const formData = new FormData();
            formData.append('favoritePlants', JSON.stringify(newFavorites));
            await fetch(apiUrl('/api/user/update-profile'), { method: 'POST', body: formData, credentials: 'include' });
        } catch (err) { console.error('Failed to save favourites:', err); }
    };

    const handleUpdateOverlayItems = (newItems) => {
        setOverlayItems(newItems);
        if (userId) saveToBackend(grids, zones, setup, positions, newItems);
    };

    // ── Bed handlers ──────────────────────────────────────────────────────────
    const handleUpdateBedLayout = (bedId, newLayout) => {
        const updated = { ...bedLayouts, [bedId]: newLayout };
        setBedLayouts(updated);
        if (userId) saveToBackend(grids, zones, setup, positions, overlayItems, updated, zoneItems);
    };

    const handleUpdateZoneItems = (zoneName, newItems) => {
        const updated = { ...zoneItems, [zoneName]: newItems };
        setZoneItems(updated);
        if (userId) saveToBackend(grids, zones, setup, positions, overlayItems, bedLayouts, updated);
    };

    const handleSaveSiteAnalysis = (data) => {
        setSiteAnalysis(data);
        setSiteAnalysisOpen(false);
        if (userId) saveToBackend(grids, zones, setup, positions, overlayItems, bedLayouts, zoneItems, false, data);
    };

    const handleAddZoneItem = (zoneName, type) => {
        const def = STRUCTURE_MAP[type] || {};
        const sizeDefaults = { 'Raised Bed': { wM: 3, hM: 1.2 }, 'Path': { wM: 4, hM: 1 } };
        const { wM, hM } = sizeDefaults[type] || { wM: 2, hM: 2 };
        const newItem = {
            id: Date.now() + Math.random(), name: type, type,
            xM: 0.5, yM: 0.5, wM, hM,
            color: def.color || null, iconData: def.icon || null, isStructure: true,
        };
        const updated = { ...zoneItems, [zoneName]: [...(zoneItems[zoneName] || []), newItem] };
        setZoneItems(updated);
        if (userId) saveToBackend(grids, zones, setup, positions, overlayItems, bedLayouts, updated);
    };

    // ── Escape to close bed editor ────────────────────────────────────────────
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            if (selectedBedElementId) { setSelectedBedElementId(null); return; }
            if (selectedBedId) { setSelectedBedId(null); setSelectedBedZone(null); }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedBedId, selectedBedElementId]);

    // ── Zone reset helpers ────────────────────────────────────────────────────

    /** Called by ZoneTabs when the ↺ button is clicked — opens the confirm dialog. */
    const handleResetZoneRequest = (zoneIndex) => {
        const isGeneral = zoneIndex === -1;
        setResetConfirm({
            type:  isGeneral ? 'general' : 'zone',
            index: zoneIndex,
            name:  isGeneral ? 'General' : (zones[zoneIndex] || 'Zone'),
        });
    };

    /** Executed after the user confirms the dialog. */
    const executeReset = () => {
        // Capture before clearing state
        const { type, index, name } = resetConfirm;
        setResetConfirm(null);

        // Store one-level undo snapshot (deep-copy mutable structures)
        undoSnapshotRef.current = {
            overlayItems: [...overlayItems],
            grids:        grids.map(g => g.map(row => [...row])),
            zoneItems:    JSON.parse(JSON.stringify(zoneItems)),
            bedLayouts:   JSON.parse(JSON.stringify(bedLayouts)),
        };

        if (type === 'general') {
            // Build updated bedLayouts without entries for General overlay beds
            const overlayBedIds = new Set(overlayItems.map(it => String(it.id)));
            const newBedLayouts = Object.fromEntries(
                Object.entries(bedLayouts).filter(([id]) => !overlayBedIds.has(id))
            );
            setOverlayItems([]);
            setBedLayouts(newBedLayouts);
            // Deselect any bed that was on General
            if (!selectedBedZone) {
                setSelectedBedId(null);
                setSelectedBedElementId(null);
            }
            clearPreview();
            if (userId) saveToBackend(grids, zones, setup, positions, [], newBedLayouts, zoneItems);
        } else {
            const zoneName = zones[index];
            // Preserve grid dimensions, clear only cell contents
            const existing = grids[index] || [];
            const rows = existing.length     || 10;
            const cols = existing[0]?.length || 10;
            const newGrids = grids.map((g, i) =>
                i === index ? createEmptyGrid(rows, cols) : g
            );
            // Remove zoneItems for this zone and corresponding bedLayouts
            const zoneItemsList = zoneItems[zoneName] || [];
            const zoneBedIds    = new Set(zoneItemsList.map(it => String(it.id)));
            const newZoneItems  = { ...zoneItems, [zoneName]: [] };
            const newBedLayouts = Object.fromEntries(
                Object.entries(bedLayouts).filter(([id]) => !zoneBedIds.has(id))
            );
            setGrids(newGrids);
            setZoneItems(newZoneItems);
            setBedLayouts(newBedLayouts);
            // Deselect any bed that was inside this zone
            if (selectedBedZone === zoneName) {
                setSelectedBedId(null);
                setSelectedBedElementId(null);
                setSelectedBedZone(null);
            }
            if (userId) saveToBackend(newGrids, zones, setup, positions, overlayItems, newBedLayouts, newZoneItems);
        }

        // Toast with inline Undo action
        toast.info(
            <span className="flex items-center gap-3 text-sm">
                <span>{type === 'general' ? 'General map reset.' : `"${name}" zone reset.`}</span>
                <button
                    className="underline font-medium text-forest"
                    onClick={() => handleUndo()}
                >Undo</button>
            </span>,
            { position: 'top-center', autoClose: 5000 }
        );
    };

    /** Restore the layout from the undo snapshot. */
    const handleUndo = () => {
        const snap = undoSnapshotRef.current;
        if (!snap) return;
        undoSnapshotRef.current = null;

        if (snap.type === 'all') {
            // Full-layout undo: restore every piece of state
            setZones(snap.zones);
            setGrids(snap.grids);
            setPositions(snap.positions);
            setOverlayItems(snap.overlayItems);
            setZoneItems(snap.zoneItems);
            setBedLayouts(snap.bedLayouts);
            setCurrentZone(snap.currentZone);
            if (userId) saveToBackend(snap.grids, snap.zones, setup, snap.positions, snap.overlayItems, snap.bedLayouts, snap.zoneItems);
        } else {
            setOverlayItems(snap.overlayItems);
            setGrids(snap.grids);
            setZoneItems(snap.zoneItems);
            setBedLayouts(snap.bedLayouts);
            if (userId) saveToBackend(snap.grids, zones, setup, positions, snap.overlayItems, snap.bedLayouts, snap.zoneItems);
        }
        toast.success('Reset undone.', { position: 'top-center', autoClose: 2000 });
    };

    // ── Vegetable Garden zone-portal handler ─────────────────────────────────
    // Called when the user clicks "Open zone" on a vegetableGarden overlay item.
    // Finds or creates the matching zone tab and switches to it.
    const handleOpenZonePortal = (item) => {
        const zoneName = item.zoneRef || item.name || 'Vegetable Garden';

        // If zone already exists, switch to it
        const existingIdx = zones.indexOf(zoneName);
        if (existingIdx !== -1) {
            setCurrentZone(existingIdx);
            setSelectedBedId(null);
            setSelectedBedElementId(null);
            setSelectedBedZone(null);
            return;
        }

        // Zone doesn't exist yet — create it
        const newZones    = [...zones, zoneName];
        const newGrids    = [...grids, createEmptyGrid(10, 10)];
        const newPositions = [...positions, { inGeneral: false, shape: 'circle', x: 0, y: 0 }];
        const newZoneIdx  = newZones.length - 1;

        // Populate zoneItems from the bedLayout rows stored for this item
        const portalBedLayout = bedLayouts[String(item.id)];
        let newZoneItems = { ...zoneItems };
        if (portalBedLayout?.rows?.length > 0) {
            // Convert bedLayout rows into zoneItems (raised-bed structures inside the zone)
            const zoneWidth  = item.wM || 8;
            const rows       = portalBedLayout.rows;
            const bedItems   = rows.map((row, i) => ({
                id:          `zbed-${item.id}-${i}`,
                name:        'Raised Bed',
                color:       '#b87348',
                isStructure: true,
                x:           0,
                y:           i * ((row.heightM || 1) + 0.3),
                wM:          row.widthM  || zoneWidth,
                hM:          row.heightM || 1.0,
                rotation:    0,
            }));
            newZoneItems[zoneName] = bedItems;

            // Also populate bedLayouts for each new zone bed from the row plant data
            const newBedLayouts = { ...bedLayouts };
            bedItems.forEach((bedItem, i) => {
                const row = rows[i];
                if (row?.plant?.name) {
                    newBedLayouts[String(bedItem.id)] = {
                        layoutMode: 'rows',
                        rows: [{
                            id:       `inner-${bedItem.id}-0`,
                            x:        0, y: 0,
                            widthM:   bedItem.wM,
                            heightM:  bedItem.hM,
                            plant:    row.plant,
                            companions: row.companions || [],
                            spacingCm: row.spacingCm || 40,
                            label:    row.label || row.plant.name,
                        }],
                        blocks: [],
                    };
                }
            });
            setBedLayouts(newBedLayouts);
            setZones(newZones);
            setGrids(newGrids);
            setPositions(newPositions);
            setZoneItems(newZoneItems);
            setCurrentZone(newZoneIdx);
            setSelectedBedId(null);
            setSelectedBedElementId(null);
            setSelectedBedZone(null);
            if (userId) saveToBackend(newGrids, newZones, setup, newPositions, overlayItems, newBedLayouts, newZoneItems);
            return;
        }

        setZones(newZones);
        setGrids(newGrids);
        setPositions(newPositions);
        setZoneItems(newZoneItems);
        setCurrentZone(newZoneIdx);
        setSelectedBedId(null);
        setSelectedBedElementId(null);
        setSelectedBedZone(null);
        if (userId) saveToBackend(newGrids, newZones, setup, newPositions, overlayItems, bedLayouts, newZoneItems);
    };

    // ── Full-layout reset helpers ─────────────────────────────────────────────

    const handleResetAllRequest = () => setResetAllOpen(true);

    const executeResetAll = () => {
        setResetAllOpen(false);

        // Snapshot everything for undo
        undoSnapshotRef.current = {
            type:         'all',
            zones:        [...zones],
            grids:        grids.map(g => g.map(row => [...row])),
            positions:    [...positions],
            overlayItems: [...overlayItems],
            zoneItems:    JSON.parse(JSON.stringify(zoneItems)),
            bedLayouts:   JSON.parse(JSON.stringify(bedLayouts)),
            currentZone,
        };

        // Clear all layout data; keep one empty grid so the canvas always has something
        const emptyGrids = [createEmptyGrid()];
        setZones([]);
        setGrids(emptyGrids);
        setPositions([]);
        setOverlayItems([]);
        setZoneItems({});
        setBedLayouts({});
        setCurrentZone(-1);
        setSelectedBedId(null);
        setSelectedBedElementId(null);
        setSelectedBedZone(null);
        clearPreview();

        // Persist to backend (setup/siteAnalysis stay untouched — not passed here)
        if (userId) saveToBackend([], [], setup, [], [], {}, {});

        toast.info(
            <span className="flex items-center gap-3 text-sm">
                <span>Entire garden layout reset.</span>
                <button className="underline font-medium text-forest" onClick={() => handleUndo()}>Undo</button>
            </span>,
            { position: 'top-center', autoClose: 6000 }
        );
    };

    // ── Permaculture preview helpers ──────────────────────────────────────────

    const clearPreview = () => {
        setPermPlanDraft(null);
        setPermPlanVariants([]);
        setActiveVariantIndex(0);
        setPreviewSelectedNames(null);
        setHoveredPreviewName(null);
        setPreviewHidden(false);
        setApplyWarning(null);
        setApplyError('');
        setSkippedElements([]);
    };

    // Called by wizard when generation succeeds.
    // planA is the food-production variant; planB is the biodiversity variant (may be null).
    const handleDraftChange = (planA, planB = null, variantWarning = null) => {
        const primary = planA || planB;
        if (primary) {
            const variants = [planA, planB].filter(Boolean);
            setPermPlanVariants(variants);
            setPermPlanDraft(primary);
            setActiveVariantIndex(0);
            setPreviewSelectedNames(null);
            setHoveredPreviewName(null);
            setPreviewHidden(false);
            setApplyWarning(null);
            setApplyError(variantWarning || '');   // show partial-failure note in the panel
            setSkippedElements([]);
            setGeneratePlanOpen(false);
            if (variantWarning) {
                toast.warn(variantWarning, { position: 'top-center', autoClose: 5000 });
            }
        } else {
            clearPreview();
        }
    };

    // Switch between Variant A and B in the side panel
    const handleVariantSwitch = (index) => {
        const plan = permPlanVariants[index];
        if (plan) {
            setPermPlanDraft(plan);
            setActiveVariantIndex(index);
            setPreviewSelectedNames(null);  // reset selection for the new variant
            setHoveredPreviewName(null);
            setApplyWarning(null);
            setApplyError('');
            setSkippedElements([]);
        }
    };

    // Called when user explicitly cancels the wizard without generating
    const handlePlanWizardClose = () => {
        setGeneratePlanOpen(false);
    };

    // Apply plan — called from side panel
    const handleApply = async (force = false) => {
        if (!permPlanDraft?._id) return;
        const selectedArr = previewSelectedNames === null ? null : [...previewSelectedNames];
        const selectedSet = selectedArr ? new Set(selectedArr) : null;

        // Send the EXACT preview element data (positions, sizes, all fields) so the
        // backend applies what the user sees in the overlay — not re-computed positions.
        // Fields are in metres, matching the proposedElements schema.
        const PREVIEW_FIELDS = ['name','action','catalogKey','canonicalType','type',
            'x','y','width','height','rotation','targetZone','permacultureZone',
            'targetElementId','plants','reason','confidence','warnings','detailPlan',
            'bedLayoutSuggestion','variantStrategy','strategyReason','strategyTags'];
        const selectedPreviewElements = displayProposedElements
            .filter(el => {
                if (el.action === 'recommendation_only') return false;
                if (el.type === 'permaculture-zone') return false;
                if (selectedSet && !selectedSet.has(el.name)) return false;
                return true;
            })
            .map(el => {
                const out = {};
                PREVIEW_FIELDS.forEach(k => { if (el[k] !== undefined) out[k] = el[k]; });
                return out;
            });

        setApplying(true);
        setApplyError('');
        try {
            const url = apiUrl(`/api/permaculture-plans/${permPlanDraft._id}/apply${force ? '?force=true' : ''}`);
            const payload = {
                ...(selectedArr ? { selectedElementNames: selectedArr } : {}),
                selectedPreviewElements,   // full element data from preview overlay
            };
            const body = JSON.stringify(payload);
            const res  = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body,
            });
            const data = await res.json();

            if (data.requiresForce) {
                setApplyWarning({ warning: data.warning });
                return;
            }
            if (data.success) {
                setApplyWarning(null);
                setSkippedElements(data.skipped || []);
                setOverlayItems(data.layout?.overlayItems || []);
                if (data.layout?.bedLayouts)  setBedLayouts(data.layout.bedLayouts);
                if (data.layout?.zoneItems)   setZoneItems(data.layout.zoneItems);
                if (data.layout?.zones)       setZones(data.layout.zones);
                if (data.layout?.grids)       setGrids(data.layout.grids);
                if (data.layout?.positions)   setPositions(data.layout.positions);
                if (!data.skipped?.length) {
                    clearPreview();
                    toast.success('Plan applied to your garden map.', { position: 'top-center', autoClose: 3000 });
                } else {
                    toast.success(
                        `Plan applied — ${data.skipped.length} element(s) could not be placed. See panel for details.`,
                        { position: 'top-center', autoClose: 4000 }
                    );
                }
            } else {
                setApplyError(data.message || 'Apply failed. Please try again.');
            }
        } catch {
            setApplyError('Network error. Please try again.');
        } finally {
            setApplying(false);
        }
    };

    // Reject plan
    const handlePreviewReject = async () => {
        if (permPlanDraft?._id) {
            try {
                await fetch(apiUrl(`/api/permaculture-plans/${permPlanDraft._id}/status`), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ status: 'rejected' }),
                });
            } catch { /* non-critical */ }
        }
        clearPreview();
    };

    // Reopen wizard (initialStep = 1 for "New plan", 2 for "Edit requirements")
    const handlePreviewRegenerate = (initialStep = 1) => {
        clearPreview();
        setWizardInitialStep(initialStep);
        setGeneratePlanOpen(true);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="h-screen flex flex-col overflow-hidden bg-paper">
            <DashboardHeader />

            {/* ── Compact toolbar — matches prototype TopBar ── */}
            <div style={{
                display: 'flex', alignItems: 'center', padding: '10px 20px',
                background: '#fbf7ea', borderBottom: '1px solid #d3cdb8',
                gap: 14, flexShrink: 0,
            }}>
                {/* Garden icon + name */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                    <div style={{
                        width: 22, height: 22, borderRadius: '50%', background: '#3d6b34',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        color: '#f4f1e6', fontSize: 11, flexShrink: 0,
                    }}>
                        🌿
                    </div>
                    <span style={{
                        fontFamily: 'Newsreader, Georgia, serif', fontSize: 15,
                        color: '#1f3a18', maxWidth: 160, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {setup.gardenName}
                    </span>
                </div>

                {/* Divider */}
                <div style={{ width: 1, height: 16, background: '#d3cdb8', flexShrink: 0 }} />

                {/* Dimensions */}
                <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    color: '#7c857a', letterSpacing: '0.06em', flexShrink: 0,
                }} className="hidden sm:inline">
                    {setup.widthM} × {setup.heightM} m · Zone {setup.hardinessZone}
                </span>

                {/* Divider */}
                <div style={{ width: 1, height: 16, background: '#d3cdb8', flexShrink: 0 }} className="hidden sm:block" />

                <GuildHealthBar placedPlantNames={placedPlantNames} allPlants={allPlants} compact />

                <div style={{ flex: 1 }} />

                {/* Site Analysis */}
                <button
                    onClick={() => setSiteAnalysisOpen(true)}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 11px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                        background: 'transparent', fontFamily: 'inherit',
                        color: siteAnalysis ? '#3d6b34' : '#7c857a',
                        border: `1px solid ${siteAnalysis ? 'rgba(61,107,52,0.4)' : '#d3cdb8'}`,
                        flexShrink: 0, transition: 'all 0.12s',
                    }}
                >
                    🌍 {g.siteAnalysis?.btn || 'Site Analysis'}
                    {siteAnalysis && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3d6b34', display: 'inline-block' }} />
                    )}
                </button>

                {/* Generate plan */}
                <button
                    onClick={() => { setWizardInitialStep(1); setGeneratePlanOpen(true); }}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', background: 'transparent',
                        color: '#3d6b34', border: '1px solid #3d6b34',
                        borderRadius: 6, fontSize: 12.5, fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                        transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#d8e3c0'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                    ✦ {g.generateBtn}
                </button>

                {/* Setup */}
                <SetupPanel setup={setup} onSave={handleSetupSave} />

                {/* Reset layout */}
                <button
                    onClick={handleResetAllRequest}
                    title="Reset entire garden layout (zones, map, beds, AI preview)"
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '6px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                        background: 'transparent', fontFamily: 'inherit',
                        color: '#b45309', border: '1px solid rgba(180,83,9,0.30)',
                        flexShrink: 0, transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fef3e8'; e.currentTarget.style.borderColor = 'rgba(180,83,9,0.55)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(180,83,9,0.30)'; }}
                >
                    ↺ Reset
                </button>

                {/* Save */}
                <button
                    onClick={() => saveToBackend(grids, zones, setup, positions, overlayItems, bedLayouts, zoneItems, true)}
                    style={{
                        padding: '7px 16px', background: '#3d6b34',
                        color: '#f4f1e6', border: 'none',
                        borderRadius: 6, fontSize: 12.5, fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                    }}
                >
                    {g.save}
                </button>
            </div>

            {/* ── Main content ── */}
            <div className="flex flex-1 overflow-hidden">

                {/* Canvas area — outer cream bg + inner rounded map frame */}
                <div className="flex-1 min-w-0 overflow-hidden flex flex-col" style={{ background: '#ece2c8', padding: 16 }}>
                    <div style={{
                        flex: 1, borderRadius: 10, overflow: 'hidden',
                        border: '1px solid #d3cdb8',
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.45), 0 2px 8px rgba(30,40,25,0.10)',
                        display: 'flex', flexDirection: 'column', minHeight: 0,
                    }}>
                    <GardenCanvas
                        zones={zones}
                        grids={grids}
                        positions={positions}
                        setup={setup}
                        currentZone={currentZone}
                        hideCompass={siteAnalysisOpen || generatePlanOpen || !!resetConfirm || resetAllOpen}
                        onSelectZone={idx => { setCurrentZone(idx); setSelectedBedId(null); setSelectedBedElementId(null); setSelectedBedZone(null); }}
                        onUpdateGrid={updateGrid}
                        onUpdatePositions={handleUpdatePositions}
                        onAddZone={handleAddZone}
                        onDeleteZone={handleDeleteZone}
                        onRenameZone={handleRenameZone}
                        plantList={allPlants}
                        overlayItems={overlayItems}
                        onUpdateOverlayItems={handleUpdateOverlayItems}
                        selectedBedId={selectedBedId}
                        onSelectBed={(id, zoneName = null) => { setSelectedBedId(id); setSelectedBedElementId(null); setSelectedBedZone(zoneName); }}
                        selectedBedElementId={selectedBedElementId}
                        onSelectBedElement={setSelectedBedElementId}
                        bedLayouts={bedLayouts}
                        onUpdateBedLayout={handleUpdateBedLayout}
                        zoneItems={zoneItems}
                        onUpdateZoneItems={handleUpdateZoneItems}
                        onAddZoneItem={handleAddZoneItem}
                        onResetZone={handleResetZoneRequest}
                        proposedItems={displayProposedElements}
                        proposedHoveredName={hoveredPreviewName}
                        proposedSelectedNames={previewSelectedNames}
                        onOpenZonePortal={handleOpenZonePortal}
                        neighbourhood={siteAnalysis?.neighbourhood || null}
                        onRotateNorth={handleRotateNorth}
                    />
                    </div>
                </div>

                {/* Right column — side preview panel OR normal sidebar */}
                <div
                    style={{
                        borderLeft: '1px solid #d3cdb8',
                        background: '#fbf7ea',
                        flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        width: permPlanDraft ? 440 : 260,
                    }}
                >
                    {permPlanDraft ? (
                        <PermaculturePlanSidePreview
                            plan={permPlanDraft}
                            selectedNames={previewSelectedNames}
                            onSelectionChange={setPreviewSelectedNames}
                            hoveredName={hoveredPreviewName}
                            onHover={setHoveredPreviewName}
                            applying={applying}
                            onApply={handleApply}
                            onReject={handlePreviewReject}
                            onRegenerate={handlePreviewRegenerate}
                            onClose={clearPreview}
                            applyWarning={applyWarning}
                            applyError={applyError}
                            skipped={skippedElements}
                            previewHidden={previewHidden}
                            onToggleHide={() => setPreviewHidden(h => !h)}
                            variants={permPlanVariants}
                            activeVariantIndex={activeVariantIndex}
                            onVariantSwitch={handleVariantSwitch}
                        />
                    ) : selectedBedId ? (
                        <BedSidebar
                            bed={
                                selectedBedZone
                                    ? (zoneItems[selectedBedZone] || []).find(it => it.id === selectedBedId)
                                    : overlayItems.find(it => it.id === selectedBedId)
                            }
                            bedLayout={bedLayouts[selectedBedId]}
                            allPlants={allPlants}
                            favoritePlants={favoritePlants}
                            selectedElementId={selectedBedElementId}
                            onSelectElement={setSelectedBedElementId}
                            onUpdateBedLayout={handleUpdateBedLayout}
                            onClose={() => { setSelectedBedId(null); setSelectedBedElementId(null); setSelectedBedZone(null); }}
                        />
                    ) : (
                        <PlantSidebar
                            setup={setup}
                            allPlants={allPlants}
                            placedPlantNames={placedPlantNames}
                            favoritePlants={favoritePlants}
                            onFavoritesChange={handleFavoritesChange}
                            isGeneralView={currentZone === -1}
                        />
                    )}
                </div>
            </div>

            {/* Reset zone confirmation dialog */}
            <ResetAllConfirmDialog
                open={resetAllOpen}
                onCancel={() => setResetAllOpen(false)}
                onConfirm={executeResetAll}
            />

            <ResetConfirmDialog
                confirm={resetConfirm}
                onCancel={() => setResetConfirm(null)}
                onConfirm={executeReset}
            />

            {/* Site analysis 4-step wizard */}
            {siteAnalysisOpen && (
                <SiteAnalysisWizard
                    setup={setup}
                    overlayItems={overlayItems}
                    zoneItems={zoneItems}
                    initialData={siteAnalysis}
                    onSave={handleSaveSiteAnalysis}
                    onClose={() => setSiteAnalysisOpen(false)}
                />
            )}

            {/* 2-step permaculture plan wizard (centered modal, Steps 1 & 2 only) */}
            {generatePlanOpen && (
                <PermaculturePlanWizard
                    setup={setup}
                    siteAnalysis={siteAnalysis}
                    favoritePlants={favoritePlants}
                    overlayItems={overlayItems}
                    initialStep={wizardInitialStep}
                    onDraftChange={handleDraftChange}
                    onClose={handlePlanWizardClose}
                    onOpenSiteAnalysis={() => {
                        setGeneratePlanOpen(false);
                        setSiteAnalysisOpen(true);
                    }}
                />
            )}

            <ToastContainer />
        </div>
    );
}
