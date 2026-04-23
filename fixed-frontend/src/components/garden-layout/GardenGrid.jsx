import { useState } from 'react';
import PlantingModal from './PlantingModal';
import { STRUCTURES } from './gardenZoneConfig';

const GUILD_BORDER_COLOR = {
    'Producer':             '#22c55e',
    'Nitrogen fixer':       '#3b82f6',
    'Pollinator attractor': '#eab308',
    'Dynamic accumulator':  '#a855f7',
    'Pest repellent':       '#f97316',
    'Groundcover':          '#14b8a6',
};

const GUILD_LEGEND = Object.entries(GUILD_BORDER_COLOR).map(([role, color]) => ({ role, color }));

const STRUCTURE_MAP = Object.fromEntries(STRUCTURES.map(s => [s.name, s]));

function getGuildBorderColor(cell, plantList) {
    if (!cell?.plant || cell.isStructure) return null;
    const plant = plantList.find(p => p.name === cell.plant);
    const role = plant?.guildRole?.[0];
    return role ? GUILD_BORDER_COLOR[role] : null;
}

export default function GardenGrid({ grid, updateGrid, plantList = [], cellSizeM = 1, hardinessZone = '7b' }) {
    const [hoveredCol, setHoveredCol] = useState(null);
    const [hoveredRow, setHoveredRow] = useState(null);
    const [hoveredCell, setHoveredCell] = useState(null);
    const [pendingDrop, setPendingDrop] = useState(null);

    const addRow = () => updateGrid([...grid, Array(grid[0].length).fill(null)]);
    const addCol = () => updateGrid(grid.map(row => [...row, null]));
    const removeCol = (i) => { if (grid[0].length > 1) updateGrid(grid.map(row => row.filter((_, j) => j !== i))); };
    const removeRow = (i) => { if (grid.length > 1) updateGrid(grid.filter((_, j) => j !== i)); };

    const handleDrop = (e, rowIndex, colIndex) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData('plant');
        if (!raw) return;
        try {
            const dropped = JSON.parse(raw);

            // ── Structures: place immediately, no modal ──
            if (dropped.isStructure) {
                const structureDef = STRUCTURE_MAP[dropped.name];
                const newCell = {
                    plant: dropped.name,
                    isStructure: true,
                    iconData: dropped.icon || structureDef?.icon,
                    structureColor: dropped.color || structureDef?.color,
                    plantedDate: null,
                    expectedHarvest: null,
                    notes: '',
                    warnings: [],
                };
                updateGrid(grid.map((row, r) => row.map((cell, c) => r === rowIndex && c === colIndex ? newCell : cell)));
                return;
            }

            // ── Plants: open planting modal ──
            const fullPlant = plantList.find(p => p.name === dropped.name);
            const zt = fullPlant?.planting?.zoneTimes?.[hardinessZone];
            const suggestedDate = zt?.directSow || zt?.transplant || new Date().toISOString().split('T')[0];
            setPendingDrop({ rowIndex, colIndex, plant: dropped, fullPlant, suggestedDate });
        } catch (err) {
            console.error('Invalid drop data', err);
        }
    };

    const handleConfirmDrop = ({ date, notes }) => {
        const { rowIndex, colIndex, plant, fullPlant } = pendingDrop;
        const plantedDate = new Date(date);
        let expectedHarvest = null;
        if (fullPlant?.planting?.daysToMaturity) {
            const h = new Date(plantedDate);
            h.setDate(h.getDate() + fullPlant.planting.daysToMaturity);
            expectedHarvest = h.toISOString().split('T')[0];
        }
        const newCell = {
            plant: plant.name,
            plantedDate: plantedDate.toISOString().split('T')[0],
            expectedHarvest,
            notes,
            warnings: [],
            iconData: plant.iconData,
        };
        updateGrid(grid.map((row, r) => row.map((cell, c) => r === rowIndex && c === colIndex ? newCell : cell)));
        setPendingDrop(null);
    };

    const handleDoubleClick = (r, c) => {
        updateGrid(grid.map((row, ri) => row.map((cell, ci) => ri === r && ci === c ? null : cell)));
    };

    const cols = grid[0]?.length || 10;
    const rows = grid.length || 10;
    const gridW = (cellSizeM * cols).toFixed(1);
    const gridH = (cellSizeM * rows).toFixed(1);

    return (
        <div className="space-y-2 flex flex-col items-center">
            {/* Column delete buttons */}
            <div className="grid relative" style={{ gridTemplateColumns: `repeat(${cols}, 56px)` }}>
                {grid[0].map((_, colIndex) => (
                    <div
                        key={colIndex}
                        onMouseEnter={() => setHoveredCol(colIndex)}
                        onMouseLeave={() => setHoveredCol(null)}
                        className="h-6 flex items-center justify-center relative"
                    >
                        {hoveredCol === colIndex && (
                            <button
                                onClick={() => removeCol(colIndex)}
                                className="absolute top-0 bg-forest text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow z-10"
                            >–</button>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex">
                <div className="flex flex-col">
                    {grid.map((row, rowIndex) => (
                        <div
                            key={rowIndex}
                            className="flex"
                            onMouseEnter={() => setHoveredRow(rowIndex)}
                            onMouseLeave={() => setHoveredRow(null)}
                        >
                            {/* Row delete button */}
                            <div className="w-6 flex items-center justify-center relative">
                                {hoveredRow === rowIndex && (
                                    <button
                                        onClick={() => removeRow(rowIndex)}
                                        className="absolute bg-forest text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow z-10"
                                    >–</button>
                                )}
                            </div>

                            {/* Grid cells */}
                            {row.map((item, colIndex) => {
                                const isStructure = item?.isStructure;
                                const structureDef = isStructure ? (STRUCTURE_MAP[item.plant] || {}) : null;
                                const borderColor = getGuildBorderColor(item, plantList);
                                const isHovered = hoveredCell?.r === rowIndex && hoveredCell?.c === colIndex;

                                const iconSrc = item?.iconData
                                    ? (item.iconData.startsWith('data:') ? item.iconData : `data:image/svg+xml;base64,${item.iconData}`)
                                    : null;

                                return (
                                    <div
                                        key={`${rowIndex}-${colIndex}`}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={e => handleDrop(e, rowIndex, colIndex)}
                                        onDoubleClick={() => handleDoubleClick(rowIndex, colIndex)}
                                        onMouseEnter={() => item?.plant && setHoveredCell({ r: rowIndex, c: colIndex, item })}
                                        onMouseLeave={() => setHoveredCell(null)}
                                        style={{
                                            ...(isStructure
                                                ? { backgroundColor: item.structureColor || structureDef?.color || '#d2b48c' }
                                                : { backgroundColor: '#7D6C57' }),
                                            ...(borderColor ? { borderColor, borderWidth: 2 } : {}),
                                        }}
                                        className="w-[56px] h-[56px] relative flex items-center justify-center border border-[#5D503E]"
                                    >
                                        {iconSrc && (
                                            <img
                                                src={iconSrc}
                                                alt={item.plant}
                                                className={`cursor-move ${isStructure ? 'w-8 h-8' : 'w-5 h-5'}`}
                                                draggable={!isStructure}
                                                onDragStart={!isStructure ? (e =>
                                                    e.dataTransfer.setData('plant', JSON.stringify({ name: item.plant, iconData: item.iconData }))
                                                ) : undefined}
                                            />
                                        )}

                                        {/* Tooltip */}
                                        {isHovered && item && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-white border border-gray-200 rounded-xl shadow-lg p-2.5 text-xs z-30 w-44 pointer-events-none">
                                                <p className="font-bold text-forest mb-1">{item.plant}</p>
                                                {isStructure ? (
                                                    <p className="text-gray-500">{STRUCTURE_MAP[item.plant]?.description || 'Structure'}</p>
                                                ) : (
                                                    <>
                                                        {item.plantedDate   && <p className="text-gray-500">Planted: <span className="text-gray-700">{item.plantedDate}</span></p>}
                                                        {item.expectedHarvest && <p className="text-gray-500">Harvest: <span className="text-gray-700">{item.expectedHarvest}</span></p>}
                                                        {item.notes         && <p className="text-gray-500 italic mt-1">{item.notes}</p>}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Add column */}
                <div className="flex items-center ml-1">
                    <button onClick={addCol} className="w-6 h-[56px] bg-forest text-white text-sm rounded flex items-center justify-center" title="Add column">+</button>
                </div>
            </div>

            {/* Add row */}
            <div className="flex mt-1">
                <div className="w-6" />
                <button onClick={addRow} className="w-[56px] h-6 bg-forest text-white rounded text-sm flex items-center justify-center" title="Add row">+</button>
            </div>

            {/* Scale indicator */}
            <p className="text-xs text-gray-400 mt-1">
                1 cell = {cellSizeM}m × {cellSizeM}m &nbsp;·&nbsp; Grid total: {gridW}m × {gridH}m
            </p>

            {/* Guild legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 justify-center max-w-md">
                {GUILD_LEGEND.map(({ role, color }) => (
                    <div key={role} className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-sm flex-shrink-0 border" style={{ backgroundColor: color }} />
                        <span className="text-xs text-gray-500">{role}</span>
                    </div>
                ))}
            </div>

            {/* Planting modal */}
            {pendingDrop && (
                <PlantingModal
                    plant={pendingDrop.plant}
                    suggestedDate={pendingDrop.suggestedDate}
                    onConfirm={handleConfirmDrop}
                    onCancel={() => setPendingDrop(null)}
                />
            )}
        </div>
    );
}
