import { useEffect, useState } from 'react';

export default function PlantSidebar() {
    const [search, setSearch] = useState('');
    const [plants, setPlants] = useState([]);

    // Load featured or favourtie plants initially
    useEffect(() => {
        const loadFavoritesOrFeatured = async () => {
            const res = await fetch('http://localhost:4000/api/user/get-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
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
                    if (favorites.length > 0) {
                        setPlants(favorites);
                    } else {
                        const featured = await fetch('http://localhost:4000/api/plants/featured');
                        const featuredData = await featured.json();
                        if (featuredData.success) setPlants(featuredData.plants);
                    }

                }
            } else {
                const featuredRes = await fetch('http://localhost:4000/api/plants/featured');
                const data = await featuredRes.json();
                if (data.success) setPlants(data.plants);
            }
        };

        loadFavoritesOrFeatured();
    }, []);


    const handleSearch = async (text) => {
        setSearch(text);

        if (!text.trim()) {
            // Reset to featured
            const res = await fetch('http://localhost:4000/api/plants/featured');
            const data = await res.json();
            if (data.success) setPlants(data.plants);
            return;
        }

        // Search all plants
        const res = await fetch(`http://localhost:4000/api/plants/search?q=${text}`);
        const data = await res.json();
        if (data.success) setPlants(data.plants);
    };

    return (
        <aside className="bg-cream p-5 rounded-lg border border-gray-200 text-forest w-full">
            <h2 className="text-lg font-bold mb-4">Choose Your Plants</h2>

            <input
                type="text"
                placeholder="Search"
                className="w-full px-3 py-2 border rounded text-sm mb-4"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
            />

            <div className="space-y-3 max-h-[610px] overflow-y-auto pr-1">
                {plants.map((plant, idx) => (
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
