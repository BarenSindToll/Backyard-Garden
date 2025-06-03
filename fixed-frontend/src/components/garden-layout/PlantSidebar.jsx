import { useEffect, useState } from 'react';

export default function PlantSidebar({ currentZone }) {
    const [search, setSearch] = useState('');
    const [plants, setPlants] = useState([]);

    const zoneType = currentZone?.toLowerCase();
    const isMainZone = zoneType === 'main garden';

    const mainElements = [
        { type: 'greenhouse', name: 'Greenhouse', color: '#B0C4DE' },
        { type: 'guild', name: 'Guild', color: '#A4C639' },
        { type: 'raisedBed', name: 'Raised Bed', color: '#A0522D' },
        { type: 'pond', name: 'Pond', color: '#87CEEB' },
        { type: 'house', name: 'House', color: '#D2691E' },
        { type: 'compost', name: 'Compost', color: '#8B4513' },
    ];

    useEffect(() => {
        if (!isMainZone) {
            const loadPlants = async () => {
                const res = await fetch('http://localhost:4000/api/user/get-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                });
                const user = await res.json();

                if (user.success && user.userData.favoritePlants?.length) {
                    const plantRes = await fetch('http://localhost:4000/api/plants/all');
                    const plantData = await plantRes.json();
                    if (plantData.success) {
                        const favorites = plantData.plants.filter(p =>
                            user.userData.favoritePlants.some(fav =>
                                fav.trim().toLowerCase() === p.name.trim().toLowerCase()
                            )
                        );
                        setPlants(favorites.length > 0 ? favorites : []);
                    }
                } else {
                    const featuredRes = await fetch('http://localhost:4000/api/plants/featured');
                    const data = await featuredRes.json();
                    if (data.success) setPlants(data.plants);
                }
            };
            loadPlants();
        }
    }, [isMainZone]);

    const handleSearch = async (text) => {
        setSearch(text);
        if (!text.trim()) {
            const res = await fetch('http://localhost:4000/api/plants/featured');
            const data = await res.json();
            if (data.success) setPlants(data.plants);
            return;
        }
        const res = await fetch(`http://localhost:4000/api/plants/search?q=${text}`);
        const data = await res.json();
        if (data.success) setPlants(data.plants);
    };

    return (
        <aside className="bg-cream p-5 rounded-lg border border-gray-200 text-forest w-full">
            <h2 className="text-lg font-bold mb-4">
                {isMainZone ? 'Add Garden Elements' : 'Choose Your Plants'}
            </h2>

            {!isMainZone && (
                <input
                    type="text"
                    placeholder="Search"
                    className="w-full px-3 py-2 border rounded text-sm mb-4"
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            )}

            <div className="space-y-3 max-h-[610px] overflow-y-auto pr-1">
                {isMainZone
                    ? mainElements.map((el, idx) => (
                        <div
                            key={idx}
                            className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
                        >
                            <span className="text-sm font-medium">{el.name}</span>
                            <div
                                draggable
                                onDragStart={(e) =>
                                    e.dataTransfer.setData(
                                        'element',
                                        JSON.stringify({
                                            type: el.type,
                                            name: el.name,
                                            color: el.color,
                                        })
                                    )
                                }
                                className="w-6 h-6 rounded-full"
                                style={{ backgroundColor: el.color }}
                                title={`Drag ${el.name}`}
                            ></div>
                        </div>
                    ))
                    : plants.map((plant, idx) => (
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
                                    <p className="text-xs text-gray-500 italic mt-0.5">{plant.note}</p>
                                )}
                            </div>
                            <img
                                src={`data:image/svg+xml;base64,${plant.iconData}`}
                                alt={`${plant.name} icon`}
                                className="w-8 h-8 cursor-pointer"
                                draggable
                                onDragStart={(e) =>
                                    e.dataTransfer.setData(
                                        'plant',
                                        JSON.stringify({ name: plant.name, iconData: plant.iconData })
                                    )
                                }
                            />
                        </div>
                    ))}
            </div>
        </aside>
    );
}
