import { useState, useEffect } from 'react';
import DashboardHeader from '../components/DashboardHeader';
import { fetchCurrentUser } from '../utils/fetchCurrentUser';
import { useLanguage } from '../utils/languageContext';
import { apiUrl, assetUrl } from '../utils/api';

const sectionKeys = ['accountSettings', 'gardenSettings', 'language', 'help'];

export function detectZoneFromLatLon(lat, lon) {
    if (!lat || !lon) return '7a';

    if (lat < 44.5) return '7b';
    if (lat >= 44.5 && lat < 45.5 && lon > 25) return '7a';
    if (lat >= 45.5 && lat < 47 && lon < 25) return '6b';
    if (lat >= 46.5 && lat < 48) return '6a';
    if (lat >= 47 || (lat < 45 && lon < 24)) return '5b';

    return '6b';
}


export default function Profile() {
    const { t, language, changeLanguage } = useLanguage();
    const p = t.profile;

    const [active, setActive] = useState(() => {
        return localStorage.getItem('profileTab') || 'accountSettings';
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [name, setName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [notification, setNotification] = useState('');
    const [email, setEmail] = useState('');
    const [location, setLocation] = useState('');
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [userImage, setUserImage] = useState(null);
    const [allPlants, setAllPlants] = useState([]);
    const [favoritePlants, setFavoritePlants] = useState([]);

    const grouped = {
        fruit: [],
        vegetable: [],
        herb: [],
        flower: [],
        tree: [],
    };

    allPlants.forEach(p => {
        if (grouped[p.category]) {
            grouped[p.category].push(p);
        }
    });

    Object.keys(grouped).forEach((key) => {
        grouped[key].sort((a, b) => a.name.localeCompare(b.name));
    });


    useEffect(() => {
        const fetchUser = async () => {
            const user = await fetchCurrentUser();
            if (user) {
                setName(user.name);
                setEmail(user.email);
                setLocation(user.location || '');
                setUserImage(user.profileImage);
                setFavoritePlants(user.favoritePlants || []);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (active === 'gardenSettings') {
            fetch(apiUrl('/api/plants/all'))
                .then(res => res.json())
                .then(data => {
                    if (data.success) setAllPlants(data.plants);
                });

            fetch(apiUrl('/api/user/get-data'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.userData.favoritePlants) {
                        setFavoritePlants(data.userData.favoritePlants);
                    }
                });
        }
    }, [active]);

    const toggleFavorite = (plantName) => {
        setFavoritePlants(prev =>
            prev.includes(plantName)
                ? prev.filter(p => p !== plantName)
                : [...prev, plantName]
        );
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (newPassword && newPassword !== confirmPassword) {
            alert(p.passwordMismatch);
            return;
        }

        try {
            const formData = new FormData();

            if (name) formData.append('name', name);
            if (email) formData.append('email', email);
            if (selectedFile) formData.append('profileImage', selectedFile);
            if (newPassword) formData.append('newPassword', newPassword);
            if (location) formData.append('location', location);
            formData.append('favoritePlants', JSON.stringify(favoritePlants));

            const res = await fetch(apiUrl('/api/user/update-profile'), {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const data = await res.json();
            if (data.success) {
                setNotification(p.saved);
                setNewPassword('');
                setConfirmPassword('');
                setSelectedFile(null);
                if (data.updatedUser?.location) {
                    setLocation(data.updatedUser.location);
                }
                if (data.updatedUser?.profileImage) {
                    setUserImage(data.updatedUser.profileImage);
                }
                setTimeout(() => setNotification(''), 3000);
            } else {
                alert(data.message || p.failedToUpdate);
            }
        } catch (err) {
            console.error(err);
            alert(p.errorOccurred);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
    };

    const fetchLocationSuggestions = async (query) => {
        if (!query) return setLocationSuggestions([]);

        try {
            const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=e3c7951748be483966dce7761fb84a39`);
            const data = await res.json();
            setLocationSuggestions(data.map(loc => `${loc.name}, ${loc.country}`));
        } catch (err) {
            console.error("Failed to fetch locations", err);
        }
    };

    const sections = sectionKeys.map(key => ({ key, label: p[key] }));

    return (
        <div className="bg-white min-h-screen">
            <DashboardHeader />
            <div className="max-w-6xl mx-auto mt-10 flex border rounded shadow bg-white overflow-hidden">
                <div className="w-60 bg-cream border-r p-4 space-y-4 text-forest">
                    <h2 className="text-lg font-bold mb-4">{p.settings}</h2>
                    {sections.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => {
                                setActive(key);
                                localStorage.setItem('profileTab', key);
                            }}
                            className={`block w-full text-left px-3 py-2 rounded hover:bg-forest hover:text-white transition ${active === key ? 'bg-forest text-white' : ''}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 p-6">
                    {active === 'accountSettings' && (
                        <div>
                            <h3 className="text-xl font-bold mb-4 text-forest">{p.profileInfo}</h3>
                            <form onSubmit={handleSave} className="space-y-4">

                                <div>
                                    <label className="block text-sm font-medium mb-1">{p.profilePhoto}</label>
                                    {preview ? (
                                        <img src={preview} alt="Preview" className="w-20 h-20 object-cover rounded-full mb-2" />
                                    ) : userImage && (
                                        <img src={assetUrl(userImage)} alt="Profile" className="w-20 h-20 object-cover rounded-full mb-2" />
                                    )}
                                    <input type="file" accept="image/*" onChange={handleFileChange} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium">{p.name}</label>
                                    <input
                                        type="text"
                                        className="w-full border px-3 py-2 rounded"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder={p.namePlaceholder}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium">{p.location}</label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => {
                                            setLocation(e.target.value);
                                            fetchLocationSuggestions(e.target.value);
                                        }}
                                        className="w-full border px-3 py-2 rounded"
                                        placeholder={p.locationPlaceholder}
                                    />
                                    {locationSuggestions.length > 0 && (
                                        <ul className="border bg-white rounded mt-1 max-h-40 overflow-y-auto">
                                            {locationSuggestions.map((loc, i) => (
                                                <li
                                                    key={i}
                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                    onClick={() => {
                                                        setLocation(loc);
                                                        setLocationSuggestions([]);
                                                    }}
                                                >
                                                    {loc}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium">{p.email}</label>
                                    <input
                                        type="email"
                                        className="w-full border px-3 py-2 rounded"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">{p.newPassword}</label>
                                        <input
                                            type="password"
                                            className="w-full border px-3 py-2 rounded"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">{p.confirmPassword}</label>
                                        <input
                                            type="password"
                                            className="w-full border px-3 py-2 rounded"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-center mt-8">
                                    <button type="submit" className="bg-forest text-white mt-6 px-6 py-2 rounded hover:bg-green-800">
                                        {p.saveAccount}
                                    </button>
                                </div>
                                {notification && (
                                    <div className="bg-green-100 text-green-800 px-4 py-2 rounded text-sm mb-4">
                                        {notification}
                                    </div>
                                )}
                            </form>
                        </div>
                    )}

                    {active === 'gardenSettings' && (
                        <div>
                            <h3 className="text-xl font-bold mb-4 text-forest">{p.gardenSettingsTitle}</h3>
                            <h4 className="text-md text-gray-700 mb-4">{p.selectPlants}</h4>

                            {Object.entries(grouped).map(([category, plants]) => (
                                <div key={category} className="mb-6">
                                    <h5 className="text-lg font-semibold capitalize mb-2">{category}s</h5>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {plants.map(plant => (
                                            <button
                                                key={plant.name}
                                                onClick={() => toggleFavorite(plant.name)}
                                                className={`border p-3 rounded flex items-center gap-2 text-sm transition
                                                    ${favoritePlants.includes(plant.name) ? 'bg-cream text-forest' : 'bg-white hover:bg-cream'}`}
                                            >
                                                <img src={`data:image/svg+xml;base64,${plant.iconData}`} alt={plant.name} className="w-6 h-6" />
                                                <span>{plant.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-center mt-8">
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="bg-forest text-white px-6 py-2 rounded hover:bg-green-800"
                                >
                                    {p.saveGarden}
                                </button>
                            </div>
                            {notification && (
                                <div className="bg-green-100 text-green-800 px-4 py-2 rounded text-sm mb-4">
                                    {notification}
                                </div>
                            )}
                        </div>
                    )}

                    {active === 'language' && (
                        <div>
                            <h3 className="text-xl font-bold mb-6 text-forest">{p.languageSetting}</h3>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => changeLanguage('en')}
                                    className={`px-6 py-3 rounded-lg border-2 font-semibold transition ${language === 'en' ? 'bg-forest text-white border-forest' : 'bg-white text-forest border-forest hover:bg-cream'}`}
                                >
                                    🇬🇧 {p.english}
                                </button>
                                <button
                                    onClick={() => changeLanguage('ro')}
                                    className={`px-6 py-3 rounded-lg border-2 font-semibold transition ${language === 'ro' ? 'bg-forest text-white border-forest' : 'bg-white text-forest border-forest hover:bg-cream'}`}
                                >
                                    🇷🇴 {p.romanian}
                                </button>
                            </div>
                        </div>
                    )}

                    {active === 'help' && (
                        <div>
                            <h3 className="text-xl font-bold mb-4 text-forest">{p.help}</h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
