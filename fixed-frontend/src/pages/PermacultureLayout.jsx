import { useState } from 'react';
import DashboardHeader from '../components/DashboardHeader';
import ZoneTabs from '../components/garden-layout/ZoneTabs';
import StructuresSidebar from '../components/garden-layout/StructuresSidebar';
import PlantSidebar from '../components/garden-layout/PlantSidebar';
import StructuresGrid from '../components/garden-layout/StructuresGrid';
import GardenGrid from '../components/garden-layout/GardenGrid';
import GuildGrid from '../components/garden-layout/GuildGrid';

export default function PermacultureLayout() {
    const [zones, setZones] = useState([
        { name: 'Main Garden', type: 'main' }
    ]);
    const [currentZone, setCurrentZone] = useState('Main Garden');
    const [zoneCounts, setZoneCounts] = useState({
        bed: 1,
        guild: 1,
        greenhouse: 1,
    });

    const handleZoneCreate = (type) => {
        const typeKey = type.toLowerCase();
        if (!['bed', 'guild', 'greenhouse'].includes(typeKey)) return;

        const number = zoneCounts[typeKey] || 1;
        const newZoneName = `${capitalize(typeKey)} ${number}`;

        if (!zones.some((z) => z.name === newZoneName)) {
            setZones([...zones, { name: newZoneName, type: typeKey }]);
            setZoneCounts({ ...zoneCounts, [typeKey]: number + 1 });
        }
    };

    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    const getZoneType = (zoneName) => {
        const match = zones.find(z => z.name === zoneName);
        return match ? match.type : 'unknown';
    };

    const handleRenameZone = (updatedNames) => {
        const updated = zones.map((zone, i) => ({
            ...zone,
            name: updatedNames[i] || zone.name,
        }));
        setZones(updated);
    };

    const handleDeleteZone = (index) => {
        const zName = zones[index].name;
        if (zName === 'Main Garden') return;
        const updated = zones.filter((_, i) => i !== index);
        setZones(updated);
        if (currentZone === zName) setCurrentZone('Main Garden');
    };

    return (
        <div className="bg-white min-h-screen">
            <DashboardHeader />
            <div className="text-center mt-8 pb-4 text-forest font-medium">
                You can design and explore your permaculture layout!
            </div>

            <main className="p-4 md:p-8 flex flex-col md:flex-row gap-6 justify-center max-w-7xl mx-auto">
                <div className="flex flex-col items-center w-full md:w-3/4">
                    <ZoneTabs
                        zones={zones.map(z => z.name)}
                        currentZone={currentZone}
                        setZones={(zoneNames) => handleRenameZone(zoneNames)}
                        setCurrentZone={setCurrentZone}
                        onAddZone={() => {
                            const newZone = `Zone ${zones.length}`;
                            setZones([...zones, { name: newZone, type: 'custom' }]);
                        }}
                        onDeleteZone={handleDeleteZone}
                        onRenameZone={handleRenameZone}
                    />

                    <div className="mt-4">
                        {currentZone === 'Main Garden' ? (
                            <StructuresGrid onZoneCreate={handleZoneCreate} />
                        ) : ['bed', 'greenhouse'].includes(getZoneType(currentZone)) ? (
                            <GardenGrid
                                grid={Array(10).fill(Array(10).fill(null))}
                                updateGrid={() => { }}
                            />
                        ) : getZoneType(currentZone) === 'guild' ? (
                            <GuildGrid />
                        ) : (
                            <div className="text-sm text-gray-600">
                                Planting not available for this zone.
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full md:w-1/4 p-4 bg-cream border-l border-gray-300">
                    <h2 className="text-xl font-bold mb-4 text-forest">
                        {currentZone === 'Main Garden' ? 'Add Garden Structures' : 'Choose Your Plants'}
                    </h2>
                    {currentZone === 'Main Garden' ? (
                        <StructuresSidebar />
                    ) : (
                        <PlantSidebar currentZone={currentZone} />
                    )}
                </div>
            </main>
        </div>
    );
}
