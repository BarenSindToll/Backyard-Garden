import { useEffect, useState } from 'react';
import DashboardHeader from '../components/DashboardHeader';
import ZoneTabs from '../components/garden-layout/ZoneTabs';
import GardenGrid from '../components/garden-layout/GardenGrid';
import PlantSidebar from '../components/garden-layout/PlantSidebar';

const createEmptyGrid = (rows = 10, cols = 10) => {
    return Array.from({ length: rows }, () => Array(cols).fill(null));
};

export default function GardenLayout() {
    const [activeSection, setActiveSection] = useState('garden');
    const [zones, setZones] = useState(['Zone 1']);
    const [currentZone, setCurrentZone] = useState(0);
    const [grids, setGrids] = useState([createEmptyGrid()]);
    const [saveMessage, setSaveMessage] = useState('');

    // ✅ Save grids/zones to backend
    const saveToBackend = (grids, zones) => {
        fetch('http://localhost:4000/api/user/save-grid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                userId: localStorage.getItem('userId'),
                grids,
                zones,
            }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setSaveMessage('Layout saved!');
                    setTimeout(() => setSaveMessage(''), 3000);
                }
            })
            .catch(err => console.error('Save failed:', err));
    };

    // ✅ Load grids/zones on mount
    useEffect(() => {
        const loadGrids = async () => {
            const res = await fetch('http://localhost:4000/api/user/load-grid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId: localStorage.getItem('userId') }),
            });

            const data = await res.json();
            if (data.success && data.grids.length) {
                setGrids(data.grids);
                setZones(data.zones);
            }
        };
        loadGrids();
    }, []);

    const handleAddZone = () => {
        const newZoneName = `Zone ${zones.length + 1}`;
        const updatedZones = [...zones, newZoneName];
        const updatedGrids = [...grids, createEmptyGrid()];
        setZones(updatedZones);
        setGrids(updatedGrids);
        setCurrentZone(updatedZones.length - 1);
        saveToBackend(updatedGrids, updatedZones);
    };

    const updateGrid = (zoneIndex, newGrid) => {
        const updated = [...grids];
        updated[zoneIndex] = newGrid;
        setGrids(updated);
        saveToBackend(updated, zones);
    };

    const handleDeleteZone = (index) => {
        const updatedZones = [...zones];
        const updatedGrids = [...grids];
        updatedZones.splice(index, 1);
        updatedGrids.splice(index, 1);

        setZones(updatedZones);
        setGrids(updatedGrids);
        setCurrentZone(prev => (prev === index ? 0 : prev > index ? prev - 1 : prev));
        saveToBackend(updatedGrids, updatedZones);
    };

    return (
        <div className="bg-cream min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-b from-[#c7b89e] to-cream shadow-sm">
                <DashboardHeader />
                <div className="text-center mt-2 pb-4 text-forest font-medium">Garden Layout</div>
                <div className="text-center pb-4 text-forest text-sm">You can create and save your own garden designs!</div>
            </div>

            ...

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

            {/* Save Layout Button */}
            <div className="flex justify-center mt-6">
                <button
                    onClick={() => saveToBackend(grids, zones)}
                    className="bg-forest text-white px-6 py-2 rounded hover:bg-green-800"
                >
                    Save Layout
                </button>
                {/*{saveMessage && (
                    <div className="mt-2 text-green-700 bg-green-100 px-4 py-2 rounded text-sm">
                        {saveMessage}
                    </div>
                )}*/}

            </div>




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
