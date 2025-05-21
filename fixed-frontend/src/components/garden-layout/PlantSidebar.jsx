import { useEffect, useState } from 'react';


export default function PlantSidebar() {
    const [search, setSearch] = useState('');
    const [plants, setPlants] = useState([]);

    useEffect(() => {
        fetch('http://localhost:4000/api/plants/all')
            .then(res => res.json())
            .then(data => {
                if (data.success) setPlants(data.plants);
            })
            .catch(err => console.error('Failed to load plants:', err));
    }, []);

    return (
        <aside className="bg-[#f7f3ec] p-5 rounded-lg border border-gray-200 text-forest w-full">
            <h2 className="text-lg font-bold mb-4">Choose Your Plants</h2>

            <input
                type="text"
                placeholder="Search"
                className="w-full px-3 py-2 border rounded text-sm mb-4"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <div className="space-y-3">
                {plants
                    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
                    .map((plant, idx) => (
                        <div
                            key={idx}
                            className="flex justify-between items-center bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
                        >
                            <div>
                                <h4 className="text-sm font-semibold">{plant.name}</h4>
                                <p className="text-xs text-gray-600">
                                    {plant.sunlight} {plant.season && `· ${plant.season}`}
                                </p>
                                {plant.note && (
                                    <p className="text-xs text-gray-500 italic mt-0.5">
                                        {plant.note}
                                    </p>
                                )}
                            </div>
                            <img
                                src={`data:image/svg+xml;base64,${plant.iconData}`}
                                alt={`${plant.name} icon`}
                                className="w-8 h-8 cursor-pointer"
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('plant', plant.name)}
                            />


                        </div>
                    ))}
            </div>
        </aside>
    );
}
