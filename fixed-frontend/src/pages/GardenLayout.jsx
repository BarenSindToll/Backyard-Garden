import { useEffect, useMemo, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DashboardHeader from '../components/DashboardHeader';
import GardenCanvas from '../components/garden-layout/GardenCanvas';
import PlantSidebar from '../components/garden-layout/PlantSidebar';
import SetupPanel from '../components/garden-layout/SetupPanel';
import GuildHealthBar from '../components/garden-layout/GuildHealthBar';
import { STRUCTURES } from '../components/garden-layout/gardenZoneConfig';
import { fetchCurrentUser } from '../utils/fetchCurrentUser';

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
    const [setup, setSetup] = useState(DEFAULT_SETUP);
    const [zones, setZones] = useState(['Zone 1']);
    const [currentZone, setCurrentZone] = useState(-1);
    const [grids, setGrids] = useState([createEmptyGrid()]);
    const [positions, setPositions] = useState(defaultPositions(1));
    const [userId, setUserId] = useState(null);
    const [allPlants, setAllPlants] = useState([]);
    const [overlayItems, setOverlayItems] = useState([]);
    const [favoritePlants, setFavoritePlants] = useState([]);

    const placedPlantNames = useMemo(
        () => grids.flat(2).map(c => c?.plant).filter(Boolean),
        [grids]
    );

    const saveToBackend = async (gridsToSave, zonesToSave, setupToSave, positionsToSave, overlayItemsToSave, showToast = false) => {
        try {
            await fetch('http://localhost:4000/api/gardenLayout/save-layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    grids: cleanForSave(gridsToSave),
                    zones: zonesToSave,
                    setup: setupToSave,
                    positions: positionsToSave,
                    overlayItems: overlayItemsToSave,
                }),
            }).then(r => r.json());
            if (showToast) toast.success('Layout saved!', { position: 'top-center', autoClose: 2000 });
        } catch (err) {
            console.error('Save failed:', err);
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
                    fetch('http://localhost:4000/api/plants/all', { credentials: 'include' }),
                    fetch('http://localhost:4000/api/gardenLayout/load-layout', { credentials: 'include' }),
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
                    if (layoutData.overlayItems?.length) setOverlayItems(layoutData.overlayItems);
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

    const handleAddZone = (zoneName, inGeneral = false) => {
        const name = zoneName || `Zone ${zones.length + 1}`;
        const cols = 4;
        const rows = 4;
        const updatedZones = [...zones, name];
        const updatedGrids = [...grids, createEmptyGrid(rows, cols)];
        const newIdx = positions.length;
        const updatedPositions = [
            ...positions,
            { x: 200 + (newIdx % 4) * 180, y: 120 + Math.floor(newIdx / 4) * 160, inGeneral },
        ];
        setZones(updatedZones);
        setGrids(updatedGrids);
        setPositions(updatedPositions);
        setCurrentZone(inGeneral ? -1 : updatedZones.length - 1);
        if (userId) saveToBackend(updatedGrids, updatedZones, setup, updatedPositions, overlayItems);
    };

    const updateGrid = (zoneIndex, newGrid) => {
        const updated = [...grids];
        updated[zoneIndex] = newGrid;
        setGrids(updated);
        if (userId) saveToBackend(updated, zones, setup, positions, overlayItems);
    };

    const handleDeleteZone = (index) => {
        const updatedZones = zones.filter((_, i) => i !== index);
        const updatedGrids = grids.filter((_, i) => i !== index);
        const updatedPositions = positions.filter((_, i) => i !== index);
        setZones(updatedZones);
        setGrids(updatedGrids);
        setPositions(updatedPositions);
        setCurrentZone(prev => {
            if (updatedZones.length === 0 || prev === index) return -1;
            if (prev > index) return prev - 1;
            return prev;
        });
        if (userId) saveToBackend(updatedGrids, updatedZones, setup, updatedPositions, overlayItems);
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
            await fetch('http://localhost:4000/api/user/update-profile', {
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

                {/* Setup button (opens slide-over) */}
                <SetupPanel setup={setup} onSave={handleSetupSave} />

                {/* Save */}
                <button
                    onClick={() => saveToBackend(grids, zones, setup, positions, overlayItems, true)}
                    className="bg-forest text-white text-xs px-4 py-1.5 rounded-lg font-medium hover:bg-green-800 transition-colors flex-shrink-0"
                >
                    Save
                </button>
            </div>

            {/* ── Main content row ── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Garden canvas */}
                <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
                    <GardenCanvas
                        zones={zones}
                        grids={grids}
                        positions={positions}
                        setup={setup}
                        currentZone={currentZone}
                        onSelectZone={setCurrentZone}
                        onUpdateGrid={updateGrid}
                        onUpdatePositions={handleUpdatePositions}
                        onAddZone={handleAddZone}
                        onDeleteZone={handleDeleteZone}
                        onRenameZone={handleRenameZone}
                        plantList={allPlants}
                        overlayItems={overlayItems}
                        onUpdateOverlayItems={handleUpdateOverlayItems}
                    />
                </div>

                {/* Sidebar — fixed width, fills height, internal scroll */}
                <div className="w-64 border-l border-gray-200 bg-white flex-shrink-0 flex flex-col overflow-hidden">
                    <PlantSidebar
                        setup={setup}
                        allPlants={allPlants}
                        placedPlantNames={placedPlantNames}
                        favoritePlants={favoritePlants}
                        onFavoritesChange={handleFavoritesChange}
                    />
                </div>
            </div>

            <ToastContainer />
        </div>
    );
}
