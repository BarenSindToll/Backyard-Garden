import { useState } from 'react';

export default function GardenGrid({ grid, updateGrid, plantList = [] }) {

    const [hoveredCol, setHoveredCol] = useState(null);
    const [hoveredRow, setHoveredRow] = useState(null);

    const addRow = () => updateGrid([...grid, Array(grid[0].length).fill(null)]);
    const addCol = () => updateGrid(grid.map(row => [...row, null]));

    const removeCol = (index) => {
        if (grid[0].length > 1) {
            updateGrid(grid.map(row => row.filter((_, i) => i !== index)));
        }
    };

    const removeRow = (index) => {
        if (grid.length > 1) {
            updateGrid(grid.filter((_, i) => i !== index));
        }
    };


    const handleDrop = (e, rowIndex, colIndex) => {
        e.preventDefault();
        const dropped = e.dataTransfer.getData('plant');
        if (!dropped) return;

        let plant;
        try {
            plant = JSON.parse(dropped);
        } catch (err) {
            console.error('Invalid plant drop data:', err);
            return;
        }

        const fullPlant = plantList.find(p => p.name === plant.name);
        const zone = '7a'; // This can be made dynamic later

        // Try to get suggested date from plant data
        const zoneData = fullPlant?.planting?.zoneTimes?.get?.(zone) || fullPlant?.planting?.zoneTimes?.[zone];
        const suggestedDate = zoneData?.directSow || zoneData?.transplant || new Date().toISOString().split('T')[0];

        const plantingInput = prompt(
            `Select planting date for ${plant.name} (YYYY-MM-DD):`,
            suggestedDate
        );
        if (!plantingInput) return;

        const plantedDate = new Date(plantingInput);
        if (isNaN(plantedDate)) {
            alert('Invalid date format. Use YYYY-MM-DD.');
            return;
        }

        let expectedHarvest = null;
        if (fullPlant?.planting?.daysToMaturity) {
            const harvestDate = new Date(plantedDate);
            harvestDate.setDate(harvestDate.getDate() + fullPlant.planting.daysToMaturity);
            expectedHarvest = harvestDate.toISOString().split('T')[0];
        }

        const newCell = {
            plant: plant.name,
            plantedDate: plantedDate.toISOString().split('T')[0],
            expectedHarvest,
            notes: '',
            warnings: [],
            iconData: plant.iconData
        };

        const newGrid = grid.map((row, rIdx) =>
            row.map((cell, cIdx) =>
                rIdx === rowIndex && cIdx === colIndex ? newCell : cell
            )
        );

        updateGrid(newGrid);
    };




    const handleDoubleClick = (rowIndex, colIndex) => {
        const newGrid = grid.map((row, rIdx) =>
            row.map((cell, cIdx) =>
                rIdx === rowIndex && cIdx === colIndex ? null : cell
            )
        );
        updateGrid(newGrid);
    };

    return (
        <div className="space-y-2 flex flex-col items-center">
            {/* Top column delete buttons */}
            <div
                className="grid relative"
                style={{ gridTemplateColumns: `repeat(${grid[0].length}, 56px)` }}
            >
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
                            >
                                –
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Grid and row controls */}
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
                                        title="Remove row"
                                    >
                                        –
                                    </button>
                                )}
                            </div>

                            {/* Grid cells */}
                            {row.map((item, colIndex) => (
                                <div
                                    key={`${rowIndex}-${colIndex}`}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                                    onDoubleClick={() => handleDoubleClick(rowIndex, colIndex)}
                                    className={`w-[56px] h-[56px] flex items-center justify-center border border-[#5D503E] ${item?.name === 'Path' ? 'bg-[#ba8d68]' : 'bg-[#7D6C57]'
                                        }`}
                                >
                                    {item?.iconData && (
                                        <img
                                            src={`data:image/svg+xml;base64,${item.iconData}`}
                                            alt={item.plant}
                                            className="w-5 h-5 cursor-move"
                                            draggable
                                            onDragStart={(e) =>
                                                e.dataTransfer.setData(
                                                    'plant',
                                                    JSON.stringify({ name: item.plant, iconData: item.iconData })
                                                )
                                            }
                                        />
                                    )}
                                </div>

                            ))}
                        </div>
                    ))}
                </div>

                {/* Add column button */}
                <div className="flex items-center ml-1">
                    <button
                        onClick={addCol}
                        className="w-6 h-[56px] bg-forest text-white text-sm rounded flex items-center justify-center"
                        title="Add column"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Add row button */}
            <div className="flex mt-1">
                <div className="w-6" />
                <button
                    onClick={addRow}
                    className="w-[56px] h-6 bg-forest text-white rounded text-sm flex items-center justify-center"
                    title="Add row"
                >
                    +
                </button>
            </div>
        </div>
    );
}
