import { useEffect, useState } from 'react';
import DashboardHeader from '../components/DashboardHeader';
import ZoneTabs from '../components/garden-layout/ZoneTabs';
import GardenGrid from '../components/garden-layout/GardenGrid';
import PlantSidebar from '../components/garden-layout/PlantSidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { fetchCurrentUser } from '../utils/fetchCurrentUser';

const createEmptyGrid = (rows = 10, cols = 10) => {
    return Array.from({ length: rows }, () => Array(cols).fill(null));
};



export default function GardenLayout() {
    const [activeSection, setActiveSection] = useState('garden');
    const [zones, setZones] = useState(['Zone 1']);
    const [currentZone, setCurrentZone] = useState(0);
    const [grids, setGrids] = useState([createEmptyGrid()]);
    const [userId, setUserId] = useState(null);

    const saveToBackend = (grids, zones, userId, showToast = false) => {
        fetch('http://localhost:4000/api/gardenLayout/save-layout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ grids, zones }),
        })
            .then(res => res.json())
            .then(data => {
                if (showToast) {
                    toast.success('Layout saved!', {
                        position: 'top-center',
                        autoClose: 2000,
                    });
                }
            })
            .catch(err => console.error('Save failed:', err));
    };

    const enrichGrid = (grid, plantsList) => {
        return grid.map(row =>
            row.map(cell => {
                if (!cell) return null;
                if (typeof cell === 'object') return cell;
                const matched = plantsList.find(p => p.name === cell);
                return matched ? { name: matched.name, iconData: matched.iconData } : null;
            })
        );
    };

    useEffect(() => {
        const loadGrids = async () => {
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

                if (layoutData.success && plantData.success) {
                    const enrichedGrids = layoutData.grids.map(grid =>
                        enrichGrid(grid, plantData.plants)
                    );
                    setZones(layoutData.zones);
                    setGrids(enrichedGrids);
                } else {
                    console.error('Failed to load layout or plants.');
                }
            } catch (err) {
                console.error('Load failed:', err);
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
        if (userId) saveToBackend(updatedGrids, updatedZones, userId);
    };

    const updateGrid = (zoneIndex, newGrid) => {
        const updated = [...grids];
        updated[zoneIndex] = newGrid;
        setGrids(updated);
        if (userId) saveToBackend(updated, zones, userId);
    };

    const handleDeleteZone = (index) => {
        const updatedZones = [...zones];
        const updatedGrids = [...grids];
        updatedZones.splice(index, 1);
        updatedGrids.splice(index, 1);
        setZones(updatedZones);
        setGrids(updatedGrids);
        setCurrentZone(prev => (prev === index ? 0 : prev > index ? prev - 1 : prev));
        if (userId) saveToBackend(updatedGrids, updatedZones, userId);
    };

    return (
        <div className="bg-cream min-h-screen">
            <div className="bg-gradient-to-b from-[#c7b89e] to-cream shadow-sm">
                <DashboardHeader />
                <div className="text-center mt-2 pb-4 text-forest font-medium">Garden Layout</div>
                <div className="text-center pb-4 text-forest text-sm">
                    You can create and save your own garden designs!
                </div>
            </div>

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
                        {grids[currentZone] && (
                            <GardenGrid
                                grid={grids[currentZone]}
                                updateGrid={(newGrid) => updateGrid(currentZone, newGrid)}
                            />
                        )}
                    </div>
                    <div className="w-full md:w-64">
                        <PlantSidebar />
                    </div>
                </main>
            )}

            <div className="flex justify-center mt-6">
                <button
                    onClick={() => saveToBackend(grids, zones, userId, true)}
                    className="bg-forest text-white px-6 py-2 rounded hover:bg-green-800"
                >
                    Save Layout
                </button>
                <ToastContainer />
            </div>

            {activeSection === 'calendar' && (
                <div className="p-8 text-center text-forest">Calendar coming soon...</div>
            )}
            {activeSection === 'weather' && (
                <div className="p-8 text-center text-forest">Weather forecast coming soon...</div>
            )}
        </div>
    );
}
