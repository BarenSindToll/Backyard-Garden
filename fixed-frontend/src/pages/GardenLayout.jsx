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
    widthM: 10,
    heightM: 10,
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

const resizeGrid = (grid, newRows, newCols) => {
    const result = [];
    for (let r = 0; r < newRows; r++) {
        const row = [];
        for (let c = 0; c < newCols; c++) {
            row.push(grid[r]?.[c] ?? null);
        }
        result.push(row);
    }
    return result;
};

const wouldLoseCells = (grids, newRows, newCols) =>
    grids.some(grid =>
        grid.some((row, r) =>
            (r >= newRows && row.some(c => c)) ||
            row.some((cell, c) => c >= newCols && cell)
        )
    );

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
        x: (i % 3) * 340 + 20,
        y: Math.floor(i / 3) * 300 + 20,
    }));

export default function GardenLayout() {
    const [setup, setSetup] = useState(DEFAULT_SETUP);
    const [zones, setZones] = useState(['Zone 1']);
    const [currentZone, setCurrentZone] = useState(0);
    const [grids, setGrids] = useState([createEmptyGrid()]);
    const [positions, setPositions] = useState(defaultPositions(1));
    const [userId, setUserId] = useState(null);
    const [allPlants, setAllPlants] = useState([]);

    const placedPlantNames = useMemo(
        () => grids.flat(2).map(c => c?.plant).filter(Boolean),
        [grids]
    );

    const saveToBackend = async (gridsToSave, zonesToSave, setupToSave, positionsToSave, showToast = false) => {
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
                            ? layoutData.positions
                            : defaultPositions(loadedZones.length)
                    );
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
        const cellSize = newSetup.cellSizeM || 1;
        const newCols = Math.max(1, Math.round(newSetup.widthM / cellSize));
        const newRows = Math.max(1, Math.round(newSetup.heightM / cellSize));
        const curGrid = grids[0] || [];
        const oldCols = curGrid[0]?.length || 10;
        const oldRows = curGrid.length || 10;
        if (newCols !== oldCols || newRows !== oldRows) {
            if (wouldLoseCells(grids, newRows, newCols)) {
                if (!window.confirm(`Resizing to ${newCols}×${newRows} will remove some placed items. Continue?`)) {
                    if (userId) saveToBackend(grids, zones, newSetup, positions);
                    return;
                }
            }
            const resized = grids.map(g => resizeGrid(g, newRows, newCols));
            setGrids(resized);
            if (userId) saveToBackend(resized, zones, newSetup, positions);
        } else {
            if (userId) saveToBackend(grids, zones, newSetup, positions);
        }
    };

    const handleAddZone = (zoneName) => {
        const name = zoneName || `Zone ${zones.length + 1}`;
        const cellSize = setup.cellSizeM || 1;
        const cols = Math.max(1, Math.round(setup.widthM / cellSize));
        const rows = Math.max(1, Math.round(setup.heightM / cellSize));
        const updatedZones = [...zones, name];
        const updatedGrids = [...grids, createEmptyGrid(rows, cols)];
        const lastPos = positions[positions.length - 1] || { x: 20, y: 20 };
        const updatedPositions = [...positions, { x: lastPos.x + 340, y: lastPos.y }];
        setZones(updatedZones);
        setGrids(updatedGrids);
        setPositions(updatedPositions);
        setCurrentZone(updatedZones.length - 1);
        if (userId) saveToBackend(updatedGrids, updatedZones, setup, updatedPositions);
    };

    const updateGrid = (zoneIndex, newGrid) => {
        const updated = [...grids];
        updated[zoneIndex] = newGrid;
        setGrids(updated);
        if (userId) saveToBackend(updated, zones, setup, positions);
    };

    const handleDeleteZone = (index) => {
        if (zones.length <= 1) return;
        const updatedZones = zones.filter((_, i) => i !== index);
        const updatedGrids = grids.filter((_, i) => i !== index);
        const updatedPositions = positions.filter((_, i) => i !== index);
        setZones(updatedZones);
        setGrids(updatedGrids);
        setPositions(updatedPositions);
        setCurrentZone(prev =>
            prev >= updatedZones.length ? updatedZones.length - 1 :
            prev === index ? 0 :
            prev > index ? prev - 1 : prev
        );
        if (userId) saveToBackend(updatedGrids, updatedZones, setup, updatedPositions);
    };

    const handleRenameZone = (updatedZones) => {
        setZones(updatedZones);
        if (userId) saveToBackend(grids, updatedZones, setup, positions);
    };

    const handleUpdatePositions = (newPositions) => {
        setPositions(newPositions);
        if (userId) saveToBackend(grids, zones, setup, newPositions);
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
                    onClick={() => saveToBackend(grids, zones, setup, positions, true)}
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
                    />
                </div>

                {/* Sidebar — fixed width, fills height, internal scroll */}
                <div className="w-64 border-l border-gray-200 bg-white flex-shrink-0 flex flex-col overflow-hidden">
                    <PlantSidebar
                        setup={setup}
                        allPlants={allPlants}
                        placedPlantNames={placedPlantNames}
                    />
                </div>
            </div>

            <ToastContainer />
        </div>
    );
}
