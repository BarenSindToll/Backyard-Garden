import { useState, useEffect } from 'react';
import DashboardHeader from '../components/DashboardHeader';

const sections = ['Account Settings', 'Garden Settings', 'Help', 'Log Out'];

export default function Profile() {
    const [active, setActive] = useState('Account Settings');
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [name, setName] = useState('');
    const userId = localStorage.getItem('userId');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [notification, setNotification] = useState('');
    const [email, setEmail] = useState('');
    const [location, setLocation] = useState('');
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [userImage, setUserImage] = useState(null);
    const [allPlants, setAllPlants] = useState([]);
    const [favoritePlants, setFavoritePlants] = useState([]);



    useEffect(() => {
        const fetchName = async () => {
            const res = await fetch('http://localhost:4000/api/user/get-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId })
            });
            const data = await res.json();
            if (data.success) {
                setName(data.userData.name);
                setEmail(data.userData.email);
                setLocation(data.userData.location || '');
                setUserImage(data.userData.profileImage);
            }
        };
        fetchName();
    }, [userId]);
    useEffect(() => {
        if (active === 'Garden Settings') {
            fetch('http://localhost:4000/api/plants/all')
                .then(res => res.json())
                .then(data => {
                    if (data.success) setAllPlants(data.plants);
                });

            // Load user favorites
            fetch('http://localhost:4000/api/user/get-data', {
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
            alert("Passwords do not match!");
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



            const res = await fetch('http://localhost:4000/api/user/update-profile', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const data = await res.json();
            if (data.success) {
                setNotification('Profile updated successfully!');
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
                alert(data.message || 'Failed to update.');
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred.");
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



    return (
        <div className="bg-cream min-h-screen">
            <DashboardHeader />
            <div className="max-w-6xl mx-auto mt-10 flex border rounded shadow bg-white overflow-hidden">
                <div className="w-60 bg-[#f9f7f3] border-r p-4 space-y-4 text-forest">
                    <h2 className="text-lg font-bold mb-4">Settings</h2>
                    {sections.map((sec) => (
                        <button
                            key={sec}
                            onClick={() => setActive(sec)}
                            className={`block w-full text-left px-3 py-2 rounded hover:bg-forest hover:text-white transition ${active === sec ? 'bg-forest text-white' : ''
                                }`}
                        >
                            {sec}
                        </button>
                    ))}
                </div>

                <div className="flex-1 p-6">
                    {active === 'Account Settings' && (
                        <div>
                            <h3 className="text-xl font-bold mb-4 text-forest">Profile Information</h3>
                            <form onSubmit={handleSave} className="space-y-4">
                                {notification && (
                                    <div className="bg-green-100 text-green-800 px-4 py-2 rounded text-sm mb-4">
                                        {notification}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Profile Photo</label>
                                    {preview ? (
                                        <img
                                            src={preview}
                                            alt="Preview"
                                            className="w-20 h-20 object-cover rounded-full mb-2"
                                        />
                                    ) : userImage && (
                                        <img
                                            src={`http://localhost:4000${userImage}`}
                                            alt="Profile"
                                            className="w-20 h-20 object-cover rounded-full mb-2"
                                        />
                                    )}
                                    <input type="file" accept="image/*" onChange={handleFileChange} />


                                </div>

                                <div>
                                    <label className="block text-sm font-medium">Name</label>
                                    <input
                                        type="text"
                                        className="w-full border px-3 py-2 rounded"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Your Name"
                                    />

                                </div>

                                <div>
                                    <label className="block text-sm font-medium">Location</label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => {
                                            setLocation(e.target.value);
                                            fetchLocationSuggestions(e.target.value);
                                        }}
                                        className="w-full border px-3 py-2 rounded"
                                        placeholder="Start typing your city..."
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
                                    <label className="block text-sm font-medium">Email</label>
                                    <input
                                        type="email"
                                        className="w-full border px-3 py-2 rounded"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">New Password</label>
                                        <input
                                            type="password"
                                            className="w-full border px-3 py-2 rounded"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Confirm Password</label>
                                        <input
                                            type="password"
                                            className="w-full border px-3 py-2 rounded"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>



                                <button
                                    type="submit" // ✅ so the form submission is triggered
                                    className="bg-forest text-white px-6 py-2 rounded hover:bg-green-800"
                                >
                                    Save Changes
                                </button>

                            </form>
                        </div>
                    )},

                    {active === 'Garden Settings' && (
                        <div>
                            <h3 className="text-xl font-bold mb-4 text-forest">Garden Settings</h3>
                            <h4 className="text-md font-semibold mb-2">Your Most Used Plants</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                                {allPlants.map((plant) => (
                                    <button
                                        key={plant.name}
                                        onClick={() => toggleFavorite(plant.name)}
                                        className={`border px-3 py-2 rounded text-sm ${favoritePlants.includes(plant.name)
                                            ? 'bg-forest text-white'
                                            : 'bg-white'
                                            }`}
                                    >
                                        {plant.name}
                                    </button>
                                ))}

                                <button
                                    type="submit" // ✅ so the form submission is triggered
                                    className="bg-forest text-white px-6 py-2 rounded hover:bg-green-800"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    )}




                    {/* Other sections remain unchanged */}
                </div>
            </div>
        </div>
    );
}
