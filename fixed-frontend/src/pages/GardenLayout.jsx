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
import { STRUCTURES } from '../components/garden-layout/gardenZoneConfig';
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <h2 className="font-bold text-gray-800 text-base mb-2">
                    {isGeneral ? 'Reset General Map?' : `Reset "${confirm.name}"?`}
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed mb-5">
                    {isGeneral
                        ? 'This will remove all elements from the General Map. Your other zones will remain.'
                        : 'This will remove all elements from this zone, but the zone itself will remain.'}
                </p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
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
    const undoSnapshotRef = useRef(null);                    // snapshot for one-level undo

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
        showToast = false
    ) => {
        try {
            const res = await fetch(apiUrl('/api/gardenLayout/save-layout'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    grids: cleanForSave(gridsToSave),
                    zones: zonesToSave,
                    setup: setupToSave,
                    positions: positionsToSave,
                    overlayItems: overlayItemsToSave,
                    bedLayouts: bedLayoutsToSave,
                    zoneItems: zoneItemsToSave,
                }),
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
                    const loadedZones = layoutData.zones?.length ? layoutData.zones : ['Zone 1'];
                    const enriched = (layoutData.grids || []).map(g => enrichGrid(g, plants));
                    const loadedGrids = enriched.length ? enriched : [createEmptyGrid()];
                    setZones(loadedZones);
                    setGrids(loadedGrids);
                    setPositions(
                        layoutData.positions?.length === loadedZones.length
                            ? layoutData.positions.map(p => ({ inGeneral: false, shape: 'circle', ...p }))
                            : defaultPositions(loadedZones.length)
                    );
                    const normalizedOverlay = (layoutData.overlayItems || []).map(it =>
                        it.id != null ? it : { ...it, id: Date.now() + Math.random() }
                    );
                    if (normalizedOverlay.length) setOverlayItems(normalizedOverlay);
                    if (layoutData.bedLayouts && typeof layoutData.bedLayouts === 'object') setBedLayouts(layoutData.bedLayouts);
                    if (layoutData.zoneItems && typeof layoutData.zoneItems === 'object') setZoneItems(layoutData.zoneItems);
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
        setOverlayItems(snap.overlayItems);
        setGrids(snap.grids);
        setZoneItems(snap.zoneItems);
        setBedLayouts(snap.bedLayouts);
        if (userId) saveToBackend(snap.grids, zones, setup, positions, snap.overlayItems, snap.bedLayouts, snap.zoneItems);
        toast.success('Reset undone.', { position: 'top-center', autoClose: 2000 });
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
    const handleDraftChange = (planA, planB = null) => {
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
            setApplyError('');
            setSkippedElements([]);
            setGeneratePlanOpen(false);
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
        setApplying(true);
        setApplyError('');
        try {
            const url  = apiUrl(`/api/permaculture-plans/${permPlanDraft._id}/apply${force ? '?force=true' : ''}`);
            const body = selectedArr ? JSON.stringify({ selectedElementNames: selectedArr }) : undefined;
            const res  = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                ...(body ? { headers: { 'Content-Type': 'application/json' }, body } : {}),
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
        <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
            <DashboardHeader />

            {/* ── Compact toolbar ── */}
            <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
                <span className="text-sm font-bold text-forest truncate max-w-[160px]">{setup.gardenName}</span>
                <span className="text-gray-300 text-xs">|</span>
                <span className="text-xs text-gray-400 hidden sm:inline">
                    {setup.widthM}m × {setup.heightM}m · Zone {setup.hardinessZone}
                </span>
                <span className="text-gray-300 text-xs hidden sm:inline">|</span>

                <GuildHealthBar placedPlantNames={placedPlantNames} allPlants={allPlants} compact />

                <div className="flex-1" />

                <button
                    onClick={() => { setWizardInitialStep(1); setGeneratePlanOpen(true); }}
                    className="flex items-center gap-1.5 text-xs text-forest border border-forest px-3 py-1.5 rounded-lg hover:bg-forest hover:text-white transition-colors flex-shrink-0 font-medium"
                >
                    🌿 {g.generateBtn}
                </button>

                <SetupPanel setup={setup} onSave={handleSetupSave} />

                <button
                    onClick={() => saveToBackend(grids, zones, setup, positions, overlayItems, bedLayouts, zoneItems, true)}
                    className="bg-forest text-white text-xs px-4 py-1.5 rounded-lg font-medium hover:bg-green-800 transition-colors flex-shrink-0"
                >
                    {g.save}
                </button>
            </div>

            {/* ── Main content ── */}
            <div className="flex flex-1 overflow-hidden">

                {/* Canvas area */}
                <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
                    <GardenCanvas
                        zones={zones}
                        grids={grids}
                        positions={positions}
                        setup={setup}
                        currentZone={currentZone}
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
                        proposedItems={previewHidden ? [] : (permPlanDraft?.proposedElements ?? [])}
                        proposedHoveredName={hoveredPreviewName}
                        proposedSelectedNames={previewSelectedNames}
                    />
                </div>

                {/* Right column — side preview panel OR normal sidebar */}
                <div
                    className="border-l border-gray-200 bg-white flex-shrink-0 flex flex-col overflow-hidden"
                    style={{ width: permPlanDraft ? 390 : 256 }}
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
                        />
                    )}
                </div>
            </div>

            {/* Reset zone confirmation dialog */}
            <ResetConfirmDialog
                confirm={resetConfirm}
                onCancel={() => setResetConfirm(null)}
                onConfirm={executeReset}
            />

            {/* 2-step permaculture plan wizard (centered modal, Steps 1 & 2 only) */}
            {generatePlanOpen && (
                <PermaculturePlanWizard
                    setup={setup}
                    favoritePlants={favoritePlants}
                    overlayItems={overlayItems}
                    initialStep={wizardInitialStep}
                    onDraftChange={handleDraftChange}
                    onClose={handlePlanWizardClose}
                />
            )}

            <ToastContainer />
        </div>
    );
}
