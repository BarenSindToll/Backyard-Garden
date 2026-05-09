import { useEffect, useMemo, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { apiUrl } from '../utils/api';
import 'react-toastify/dist/ReactToastify.css';
import DashboardHeader from '../components/DashboardHeader';
import GardenCanvas from '../components/garden-layout/GardenCanvas';
import PlantSidebar from '../components/garden-layout/PlantSidebar';
import SetupPanel from '../components/garden-layout/SetupPanel';
import GuildHealthBar from '../components/garden-layout/GuildHealthBar';
import BedSidebar from '../components/garden-layout/BedSidebar';
import { STRUCTURES } from '../components/garden-layout/gardenZoneConfig';
import { fetchCurrentUser } from '../utils/fetchCurrentUser';
import { useLanguage } from '../utils/languageContext';
import GenerateGardenModal from '../components/garden-layout/GenerateGardenModal';

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

export default function GardenLayout() {
    const { t } = useLanguage();
    const g = t.garden;
    const [setup, setSetup] = useState(DEFAULT_SETUP);
    const [zones, setZones] = useState(['Zone 1']);
    const [currentZone, setCurrentZone] = useState(-1);
    const [grids, setGrids] = useState([createEmptyGrid()]);
    const [positions, setPositions] = useState(defaultPositions(1));
    const [userId, setUserId] = useState(null);
    const [allPlants, setAllPlants] = useState([]);
    const [overlayItems, setOverlayItems] = useState([]);
    const [favoritePlants, setFavoritePlants] = useState([]);
    const [generateOpen, setGenerateOpen] = useState(false);
    const [bedLayouts, setBedLayouts] = useState({});
    const [zoneItems, setZoneItems] = useState({});
    const [selectedBedId, setSelectedBedId] = useState(null);
    const [selectedBedElementId, setSelectedBedElementId] = useState(null);
    const [selectedBedZone, setSelectedBedZone] = useState(null);

    const placedPlantNames = useMemo(
        () => grids.flat(2).map(c => c?.plant).filter(Boolean),
        [grids]
    );

    const saveToBackend = async (gridsToSave, zonesToSave, setupToSave, positionsToSave, overlayItemsToSave, bedLayoutsToSave = bedLayouts, zoneItemsToSave = zoneItems, showToast = false) => {
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
                console.error('Save failed:', data.message);
                if (showToast) toast.error('Save failed. Please try again.', { position: 'top-center', autoClose: 3000 });
                return false;
            }
            if (showToast) toast.success(g.layoutSaved, { position: 'top-center', autoClose: 2000 });
            return true;
        } catch (err) {
            console.error('Save failed:', err);
            if (showToast) toast.error('Save failed. Please try again.', { position: 'top-center', autoClose: 3000 });
            return false;
        }
    };

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
                    // Normalise overlayItems — ensure every item has a stable id
                const normalizedOverlay = (layoutData.overlayItems || []).map(it =>
                    it.id != null ? it : { ...it, id: Date.now() + Math.random() }
                );
                if (normalizedOverlay.length) setOverlayItems(normalizedOverlay);
                if (layoutData.bedLayouts && typeof layoutData.bedLayouts === 'object') {
                    setBedLayouts(layoutData.bedLayouts);
                }
                if (layoutData.zoneItems && typeof layoutData.zoneItems === 'object') {
                    setZoneItems(layoutData.zoneItems);
                }
                    if (layoutData.setup && Object.keys(layoutData.setup).length > 0) {
                        setSetup({ ...DEFAULT_SETUP, ...layoutData.setup });
                    } else if (user.zone) {
                        setSetup(s => ({ ...s, hardinessZone: user.zone }));
                    }
                } else if (user.zone) {
                    setSetup(s => ({ ...s, hardinessZone: user.zone }));
                }
            } catch (err) {
                console.error('Load failed:', err);
            }
        };
        load();
    }, []);

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
        setZones(updatedZones);
        setGrids(updatedGrids);
        setPositions(updatedPositions);
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

        setZones(updatedZones);
        setGrids(updatedGrids);
        setPositions(updatedPositions);
        setZoneItems(updatedZoneItems);
        setBedLayouts(updatedBedLayouts);
        if (selectedBedZone === deletedZoneName) { setSelectedBedId(null); setSelectedBedElementId(null); setSelectedBedZone(null); }
        setCurrentZone(prev => {
            if (updatedZones.length === 0 || prev === index) return -1;
            if (prev > index) return prev - 1;
            return prev;
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
            await fetch(apiUrl('/api/user/update-profile'), {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });
        } catch (err) {
            console.error('Failed to save favourites:', err);
        }
    };

    const handleUpdateOverlayItems = (newItems) => {
        setOverlayItems(newItems);
        if (userId) saveToBackend(grids, zones, setup, positions, newItems);
    };

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
            id: Date.now() + Math.random(),
            name: type,
            type,
            xM: 0.5,
            yM: 0.5,
            wM,
            hM,
            color: def.color || null,
            iconData: def.icon || null,
            isStructure: true,
        };
        const updated = { ...zoneItems, [zoneName]: [...(zoneItems[zoneName] || []), newItem] };
        setZoneItems(updated);
        if (userId) saveToBackend(grids, zones, setup, positions, overlayItems, bedLayouts, updated);
    };

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            if (selectedBedElementId) { setSelectedBedElementId(null); return; }
            if (selectedBedId) { setSelectedBedId(null); setSelectedBedZone(null); }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedBedId, selectedBedElementId]);

    // Build a grid pre-populated with plants from the AI plan, distributed in horizontal bands
    const buildGridFromPlants = (plantNames, rows = 6, cols = 8) => {
        const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
        const validPlants = plantNames
            .map(name => allPlants.find(p => p.name === name))
            .filter(Boolean);
        if (!validPlants.length) return grid;

        validPlants.forEach((plant, idx) => {
            const startRow = Math.floor(idx * rows / validPlants.length);
            const endRow = Math.floor((idx + 1) * rows / validPlants.length);
            for (let r = startRow; r < endRow; r++) {
                for (let c = 0; c < cols; c++) {
                    grid[r][c] = { plant: plant.name, iconData: plant.iconData, spanCols: 1, spanRows: 1 };
                }
            }
        });
        return grid;
    };

    // Spread generated zones across the general map in a grid layout
    const generatedPositions = (count) =>
        Array.from({ length: count }, (_, i) => ({
            x: 130 + (i % 3) * 170,
            y: 130 + Math.floor(i / 3) * 155,
            inGeneral: true,
            shape: 'circle',
        }));

    const estimatePxPerM = (widthM, heightM) => {
        if (!widthM || !heightM) return 10;
        const estW = Math.max(600, (window.innerWidth || 1200) - 286);
        const estH = Math.max(400, (window.innerHeight || 800) - 160);
        return Math.max(4, Math.min(estW / widthM, estH / heightM));
    };

    const handleApplyGeneratedPlan = async (plan, mode) => {
        const newZoneNames = plan.zones.map(z => z.name);
        const newGrids = plan.zones.map(z => buildGridFromPlants(z.plants));

        let finalZones, finalGrids, finalPositions;

        if (mode === 'replace') {
            finalZones = newZoneNames;
            finalGrids = newGrids;
            finalPositions = generatedPositions(newZoneNames.length);
        } else {
            finalZones = [...zones, ...newZoneNames];
            finalGrids = [...grids, ...newGrids];
            finalPositions = [...positions, ...generatedPositions(newZoneNames.length)];
        }

        // Convert suggested structures from metres → base pixels and add to existing overlayItems
        // Existing structures are always kept regardless of replace/add mode
        let finalOverlayItems = overlayItems;
        if (plan.structures?.length > 0) {
            const pxPerM = estimatePxPerM(setup.widthM, setup.heightM);
            const newStructureItems = plan.structures.map(s => {
                const def = STRUCTURE_MAP[s.name] || {};
                return {
                    id: Date.now() + Math.random(),
                    name: s.name,
                    x: Math.round(s.xM * pxPerM),
                    y: Math.round(s.yM * pxPerM),
                    wM: s.wM,
                    hM: s.hM,
                    isStructure: true,
                    iconData: def.icon ?? null,
                    color: def.color ?? '#888',
                    rotation: 0,
                };
            });
            finalOverlayItems = [...overlayItems, ...newStructureItems];
        }

        setZones(finalZones);
        setGrids(finalGrids);
        setPositions(finalPositions);
        setOverlayItems(finalOverlayItems);
        setCurrentZone(-1);
        setGenerateOpen(false);
        if (userId) await saveToBackend(finalGrids, finalZones, setup, finalPositions, finalOverlayItems, bedLayouts, zoneItems, true);
    };

    return (
        /* Full viewport — no outer scroll */
        <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
            <DashboardHeader />

            {/* ── Compact app toolbar ── */}
            <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
                <span className="text-sm font-bold text-forest truncate max-w-[160px]">{setup.gardenName}</span>
                <span className="text-gray-300 text-xs">|</span>
                <span className="text-xs text-gray-400 hidden sm:inline">
                    {setup.widthM}m × {setup.heightM}m · Zone {setup.hardinessZone}
                </span>
                <span className="text-gray-300 text-xs hidden sm:inline">|</span>

                {/* Guild health — compact dots */}
                <GuildHealthBar
                    placedPlantNames={placedPlantNames}
                    allPlants={allPlants}
                    compact
                />

                <div className="flex-1" />

                {/* Generate permaculture plan */}
                <button
                    onClick={() => setGenerateOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-forest border border-forest px-3 py-1.5 rounded-lg hover:bg-forest hover:text-white transition-colors flex-shrink-0 font-medium"
                >
                    {g.generateBtn}
                </button>

                {/* Setup button (opens slide-over) */}
                <SetupPanel setup={setup} onSave={handleSetupSave} />

                {/* Save */}
                <button
                    onClick={() => saveToBackend(grids, zones, setup, positions, overlayItems, bedLayouts, zoneItems, true)}
                    className="bg-forest text-white text-xs px-4 py-1.5 rounded-lg font-medium hover:bg-green-800 transition-colors flex-shrink-0"
                >
                    {g.save}
                </button>
            </div>

            {/* ── Main content row ── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Garden canvas — always visible */}
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
                    />
                </div>

                {/* Contextual sidebar */}
                <div className="w-64 border-l border-gray-200 bg-white flex-shrink-0 flex flex-col overflow-hidden">
                    {selectedBedId ? (
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

            {generateOpen && (
                <GenerateGardenModal
                    setup={setup}
                    favoritePlants={favoritePlants}
                    overlayItems={overlayItems}
                    onApply={handleApplyGeneratedPlan}
                    onClose={() => setGenerateOpen(false)}
                />
            )}
            <ToastContainer />
        </div>
    );
}
