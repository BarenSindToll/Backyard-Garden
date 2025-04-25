import { useEffect, useState } from 'react';
import DashboardHeader from '../components/DashboardHeader';
import ZoneTabs from '../components/garden-layout/ZoneTabs';
import GardenGrid from '../components/garden-layout/GardenGrid';
import PlantSidebar from '../components/garden-layout/PlantSidebar';

const createEmptyGrid = (rows = 10, cols = 10) => {
    return Array.from({ length: rows }, () => Array(cols).fill(null));
};

export default function Home() {
    const [activeSection, setActiveSection] = useState('garden');
    const [zones, setZones] = useState(['Zone 1']);
    const [currentZone, setCurrentZone] = useState(0);
    const [grids, setGrids] = useState([createEmptyGrid()]);

    // 🔁 Load saved grids from backend on mount
    useEffect(() => {
        const loadGrids = async () => {
            try {
                const res = await fetch('http://localhost:4000/api/user/load-grid', {
                    credentials: 'include'
                });
                const data = await res.json();
                if (data.success && data.grids.length > 0) {
                    setGrids(data.grids);
                    setZones(data.grids.map((_, i) => `Zone ${i + 1}`));
                }
            } catch (err) {
                console.error('Failed to load grids', err);
            }
        };
        loadGrids();
    }, []);

    // 💾 Auto-save to backend on update
    const saveToBackend = (grids) => {
        fetch('http://localhost:4000/api/user/save-grid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ grids }),
        });
    };

    const handleAddZone = () => {
        const newZoneName = `Zone ${zones.length + 1}`;
        const newZones = [...zones, newZoneName];
        const newGrids = [...grids, createEmptyGrid()];
        setZones(newZones);
        setGrids(newGrids);
        setCurrentZone(zones.length);
        saveToBackend(newGrids);
    };

    const updateGrid = (zoneIndex, newGrid) => {
        const updated = [...grids];
        updated[zoneIndex] = newGrid;
        setGrids(updated);
        saveToBackend(updated);
    };

    const handleDeleteZone = (index) => {
        const updatedZones = [...zones];
        const updatedGrids = [...grids];
        updatedZones.splice(index, 1);
        updatedGrids.splice(index, 1);

        setZones(updatedZones);
        setGrids(updatedGrids);
        setCurrentZone(prev => (prev === index ? 0 : prev > index ? prev - 1 : prev));
        saveToBackend(updatedGrids);
    };

    return (
        <div className="bg-cream min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-b from-[#c7b89e] to-cream shadow-sm">
                <DashboardHeader />
                <div className="text-center mt-2 pb-4">
                    <nav className="flex justify-center space-x-8 text-forest font-medium">
                        {['garden', 'calendar', 'weather'].map(section => (
                            <button
                                key={section}
                                className={`hover:underline ${activeSection === section ? 'font-semibold underline' : ''}`}
                                onClick={() => setActiveSection(section)}
                            >
                                {section === 'garden' ? 'Garden Layout' :
                                    section === 'calendar' ? 'Calendar' :
                                        'Weather Forecast'}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Garden Section */}
            {activeSection === 'garden' && (
                <main className="p-4 md:p-8 flex flex-col md:flex-row gap-6 justify-center max-w-7xl mx-auto">
                    <div className="flex flex-col items-center">
                        <ZoneTabs
                            zones={zones}
                            currentZone={currentZone}
                            setZones={setZones}
                            setCurrentZone={setCurrentZone}
                            onAddZone={handleAddZone}
                            onDeleteZone={handleDeleteZone}
                        />
                        <GardenGrid
                            grid={grids[currentZone]}
                            updateGrid={(newGrid) => updateGrid(currentZone, newGrid)}
                        />
                    </div>
                    <div className="w-full md:w-64">
                        <PlantSidebar />
                    </div>
                </main>
            )}

            {/* Other Sections */}
            {activeSection === 'calendar' && (
                <div className="p-8 text-center text-forest">Calendar coming soon...</div>
            )}
            {activeSection === 'weather' && (
                <div className="p-8 text-center text-forest">Weather forecast coming soon...</div>
            )}
        </div>
    );
}
