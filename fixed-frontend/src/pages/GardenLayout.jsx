import { useEffect, useMemo, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DashboardHeader from '../components/DashboardHeader';
import ZoneCanvas from '../components/garden-layout/ZoneCanvas';
import GardenGrid from '../components/garden-layout/GardenGrid';
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

// Resize a single grid to newRows × newCols, preserving existing cells
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

// Check if resizing would lose any placed cells
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

            // Structure cell
            if (base.isStructure || STRUCTURE_MAP[name]) {
                const def = STRUCTURE_MAP[name];
                return { ...base, plant: name, isStructure: true, iconData: def?.icon ?? base.iconData, structureColor: def?.color ?? base.structureColor };
            }

            // Plant cell
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

export default function GardenLayout() {
    const [setup, setSetup] = useState(DEFAULT_SETUP);
    const [zones, setZones] = useState(['Zone 1']);
    const [currentZone, setCurrentZone] = useState(0);
    const [grids, setGrids] = useState([createEmptyGrid()]);
    const [userId, setUserId] = useState(null);
    const [allPlants, setAllPlants] = useState([]);

    const currentGrid = grids[currentZone] ?? createEmptyGrid();

    const placedPlantNames = useMemo(
        () => grids.flat(2).map(c => c?.plant).filter(Boolean),
        [grids]
    );

    const saveToBackend = async (gridsToSave, zonesToSave, setupToSave, showToast = false) => {
        try {
            await fetch('http://localhost:4000/api/gardenLayout/save-layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    grids: cleanForSave(gridsToSave),
                    zones: zonesToSave,
                    setup: setupToSave,
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
                    const enriched = (layoutData.grids || []).map(g => enrichGrid(g, plants));
                    setZones(layoutData.zones?.length ? layoutData.zones : ['Zone 1']);
                    setGrids(enriched.length ? enriched : [createEmptyGrid()]);
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
        const oldCols = currentGrid[0]?.length || 10;
        const oldRows = currentGrid.length || 10;

        if (newCols !== oldCols || newRows !== oldRows) {
            if (wouldLoseCells(grids, newRows, newCols)) {
                if (!window.confirm(`Resizing to ${newCols}×${newRows} will remove some placed items. Continue?`)) {
                    if (userId) saveToBackend(grids, zones, newSetup);
                    return;
                }
            }
            const resized = grids.map(g => resizeGrid(g, newRows, newCols));
            setGrids(resized);
            if (userId) saveToBackend(resized, zones, newSetup);
        } else {
            if (userId) saveToBackend(grids, zones, newSetup);
        }
    };

    const handleAddZone = (zoneName) => {
        const name = zoneName || `Zone ${zones.length + 1}`;
        const cellSize = setup.cellSizeM || 1;
        const cols = Math.max(1, Math.round(setup.widthM / cellSize));
        const rows = Math.max(1, Math.round(setup.heightM / cellSize));
        const updatedZones = [...zones, name];
        const updatedGrids = [...grids, createEmptyGrid(rows, cols)];
        setZones(updatedZones);
        setGrids(updatedGrids);
        setCurrentZone(updatedZones.length - 1);
        if (userId) saveToBackend(updatedGrids, updatedZones, setup);
    };

    const updateGrid = (zoneIndex, newGrid) => {
        const updated = [...grids];
        updated[zoneIndex] = newGrid;
        setGrids(updated);
        if (userId) saveToBackend(updated, zones, setup);
    };

    const handleDeleteZone = (index) => {
        if (zones.length <= 1) return;
        const updatedZones = zones.filter((_, i) => i !== index);
        const updatedGrids = grids.filter((_, i) => i !== index);
        setZones(updatedZones);
        setGrids(updatedGrids);
        setCurrentZone(prev => (prev >= updatedZones.length ? updatedZones.length - 1 : prev === index ? 0 : prev > index ? prev - 1 : prev));
        if (userId) saveToBackend(updatedGrids, updatedZones, setup);
    };

    const handleRenameZone = (updatedZones) => {
        setZones(updatedZones);
        if (userId) saveToBackend(grids, updatedZones, setup);
    };

    const cellSizeM = setup.cellSizeM || 1;

    return (
        <div className="bg-white min-h-screen">
            <DashboardHeader />

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-4">
                {/* Page header */}
                <div>
                    <h1 className="text-2xl font-bold text-forest">{setup.gardenName}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Design your permacultural garden — plan areas, drag plants and structures onto each zone's grid
                    </p>
                </div>

                {/* Setup panel */}
                <SetupPanel setup={setup} onSave={handleSetupSave} />

                {/* Guild health bar */}
                <GuildHealthBar placedPlantNames={placedPlantNames} allPlants={allPlants} />

                {/* Garden canvas — zone overview */}
                <ZoneCanvas
                    zones={zones}
                    grids={grids}
                    currentZone={currentZone}
                    onSelect={setCurrentZone}
                    onAdd={handleAddZone}
                    onDelete={handleDeleteZone}
                    onRename={handleRenameZone}
                    gardenName={setup.gardenName}
                    widthM={setup.widthM}
                    heightM={setup.heightM}
                />

                {/* Active zone grid + sidebar */}
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* Zone grid */}
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                        {zones[currentZone] && (
                            <div className="text-sm font-semibold text-forest px-1">
                                Editing: {zones[currentZone]}
                            </div>
                        )}
                        <div className="flex justify-center overflow-x-auto pb-2">
                            <GardenGrid
                                grid={currentGrid}
                                updateGrid={newGrid => updateGrid(currentZone, newGrid)}
                                plantList={allPlants}
                                cellSizeM={cellSizeM}
                                hardinessZone={setup.hardinessZone}
                            />
                        </div>
                    </div>

                    {/* Smart sidebar */}
                    <div className="w-full lg:w-72 flex-shrink-0">
                        <PlantSidebar
                            setup={setup}
                            allPlants={allPlants}
                            placedPlantNames={placedPlantNames}
                        />
                    </div>
                </div>

                {/* Save */}
                <div className="flex justify-center pt-2 pb-8">
                    <button
                        onClick={() => saveToBackend(grids, zones, setup, true)}
                        className="bg-forest text-white px-10 py-3 rounded-xl hover:bg-green-800 font-medium text-sm shadow-md transition-colors"
                    >
                        Save Layout
                    </button>
                </div>
            </div>

            <ToastContainer />
        </div>
    );
}
