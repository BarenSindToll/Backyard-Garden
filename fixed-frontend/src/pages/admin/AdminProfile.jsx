import { useState, useEffect } from 'react';
import DashboardHeader from '../../components/DashboardHeader';
import { fetchCurrentUser } from '../../utils/fetchCurrentUser';
import { useNavigate } from 'react-router-dom';

const sections = ['Account Settings', 'Blog Management', 'Garden Settings', 'Users Settings', 'Help'];


export default function Profile() {
    const [active, setActive] = useState(() => {
        return localStorage.getItem('profileTab') || 'Account Settings';
    });
    //this saves the last viewed section to show on refresh
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
    const [editedPlants, setEditedPlants] = useState({});
    const [plantIconFiles, setPlantIconFiles] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [plantIconPreviews, setPlantIconPreviews] = useState({});

    const [newPlantName, setNewPlantName] = useState('');
    const [newPlantCategory, setNewPlantCategory] = useState('vegetable');
    const [newPlantIcon, setNewPlantIcon] = useState(null);
    const [showAllPlants, setShowAllPlants] = useState(false);

    const [userList, setUserList] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [userFilter, setUserFilter] = useState('active'); // 'active' | 'inactive' | 'deleted'


    const [editingUserId, setEditingUserId] = useState(null);
    const [editedUsers, setEditedUsers] = useState({});
    const navigate = useNavigate();




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
        if (active === 'Users Settings') {
            fetch(`http://localhost:4000/api/admin/users?search=${userSearch}&filter=${userFilter}`, {
                credentials: 'include'
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) setUserList(data.users);
                });
        }
    }, [active, userSearch, userFilter]);



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
                setNotification('Settings updated successfully!');
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

    //editing plants
    const handleEditName = (id, newName) => {
        setEditedPlants(prev => ({ ...prev, [id]: { ...(prev[id] || {}), name: newName } }));
    };

    const handleEditIcon = (id, file) => {
        setPlantIconFiles(prev => ({ ...prev, [id]: file }));

        const reader = new FileReader();
        reader.onloadend = () => {
            setPlantIconPreviews(prev => ({ ...prev, [id]: reader.result }));
        };
        if (file) reader.readAsDataURL(file);

        // Optional: clear file input (if you re-render it dynamically)
        const input = document.querySelector(`#plant-icon-input-${id}`);
        if (input) input.value = '';
    };

    const handleEditCategory = (id, newCategory) => {
        setEditedPlants(prev => ({
            ...prev,
            [id]: { ...(prev[id] || {}), category: newCategory }
        }));
    };


    const handleAddPlant = async () => {
        if (!newPlantName || !newPlantIcon) {
            alert("Please provide a name and SVG icon.");
            return;
        }

        const formData = new FormData();
        formData.append('name', newPlantName);
        formData.append('category', newPlantCategory);
        formData.append('icon', newPlantIcon);

        const res = await fetch('http://localhost:4000/api/plants/create', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        const data = await res.json();
        if (data.success) {
            setAllPlants(prev => [...prev, data.plant]);
            setNewPlantName('');
            setNewPlantCategory('vegetable');
            setNewPlantIcon(null);
            alert('Plant added successfully!');
        } else {
            alert(data.message || 'Failed to add plant.');
        }
    };


    const handleDeletePlant = async (id) => {
        if (!window.confirm('Delete this plant?')) return;
        const res = await fetch(`http://localhost:4000/api/plants/delete/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        const data = await res.json();
        if (data.success) {
            setAllPlants(prev => prev.filter(p => p._id !== id));
        } else {
            alert(data.message || 'Failed to delete plant.');
        }
    };


    const handleSavePlantEdits = async () => {
        const updateIds = new Set([
            ...Object.keys(editedPlants),
            ...Object.keys(plantIconFiles),
        ]);

        if (updateIds.size === 0) {
            alert("No changes to save.");
            return;
        }

        for (const id of updateIds) {
            const formData = new FormData();

            if (editedPlants[id]?.name) {
                formData.append('name', editedPlants[id].name);
            }
            if (editedPlants[id]?.category) {
                formData.append('category', editedPlants[id].category);
            }
            if (plantIconFiles[id]) {
                formData.append('icon', plantIconFiles[id]);
            }

            console.log(`⬆️ Updating plant: ${id}`);
            const res = await fetch(`http://localhost:4000/api/plants/update/${id}`, {
                method: 'PUT',
                body: formData,
                credentials: 'include',
            });

            const data = await res.json();
            if (!data.success) {
                console.error(`❌ Failed to update plant ${id}`, data.message);
            } else {
                console.log(`✅ Updated plant ${id}`);
            }
        }

        // Refresh UI
        setEditedPlants({});
        setPlantIconFiles({});
        setPlantIconPreviews({});

        const refreshed = await fetch('http://localhost:4000/api/plants/all');
        const data = await refreshed.json();
        if (data.success) {
            setAllPlants(data.plants);
        }
    };

    const handleSaveUser = async (id) => {
        const updated = editedUsers[id];
        if (!updated) return;

        const res = await fetch(`http://localhost:4000/api/admin/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(updated),
        });

        const data = await res.json();
        if (data.success) {
            setUserList(prev =>
                prev.map(u => u._id === id ? { ...u, ...updated } : u)
            );
            setEditingUserId(null);
            setEditedUsers(prev => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            });
        } else {
            alert(data.message || 'Failed to update user');
        }
    };


    const handleDeleteUser = async (user) => {
        const confirm = window.confirm(`Permanently delete user "${user.name || user.email}"?`);
        if (!confirm) return;

        const res = await fetch(`http://localhost:4000/api/admin/users/${user._id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await res.json();
        if (data.success) {
            setUserList(prev => prev.filter(u => u._id !== user._id));
        } else {
            alert(data.message || 'Failed to delete user');
        }
    };

    const cancelEdit = (id) => {
        setEditingUserId(null);
        setEditedUsers(prev => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
        });
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
                            onClick={() => {
                                setActive(sec);
                                localStorage.setItem('profileTab', sec);
                            }}
                            className={`block w-full text-left px-3 py-2 rounded hover:bg-forest hover:text-white transition ${active === sec ? 'bg-forest text-white' : ''
                                }`}
                        >
                            {sec}
                        </button>
                    ))}
                </div>

                <div className="flex-1 p-4">
                    {active === 'Account Settings' && (
                        <div>
                            <h3 className="text-xl font-bold mb-4 text-forest">Profile Information</h3>
                            <form onSubmit={handleSave} className="space-y-4">

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


                                <div className="flex justify-center mt-8">
                                    <button
                                        type="submit" // so the form submission is triggered
                                        className="bg-forest text-white px-6 py-2 rounded hover:bg-green-800"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                                {notification && (
                                    <div className="bg-green-100 text-green-800 px-4 py-2 rounded text-sm mb-4">
                                        {notification}
                                    </div>
                                )}

                            </form>
                        </div>
                    )},

                    {active === 'Garden Settings' && (
                        <div>
                            <h3 className="text-xl font-bold mb-6 text-forest">Manage All Plants</h3>

                            {/* Search and Filter at Top */}
                            <div className="mb-6 flex flex-col sm:flex-row gap-4">
                                <input
                                    type="text"
                                    placeholder="Search plant name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="flex-1 border px-3 py-2 rounded text-sm"
                                />
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="border px-3 py-2 rounded text-sm bg-white"
                                >
                                    <option value="All">All Categories</option>
                                    <option value="vegetable">Vegetables</option>
                                    <option value="fruit">Fruits</option>
                                    <option value="herb">Herbs</option>
                                    <option value="flower">Flowers</option>
                                    <option value="tree">Trees</option>
                                </select>
                            </div>

                            {/* Add New Plant Below Filters */}
                            <div className="mb-10 border rounded p-4 bg-white shadow-sm">
                                <h4 className="text-md font-semibold text-forest mb-3">Add New Plant</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <input
                                        type="text"
                                        value={newPlantName}
                                        onChange={(e) => setNewPlantName(e.target.value)}
                                        placeholder="Plant name"
                                        className="border px-3 py-2 rounded text-sm"
                                    />
                                    <select
                                        value={newPlantCategory}
                                        onChange={(e) => setNewPlantCategory(e.target.value)}
                                        className="border px-3 py-2 rounded text-sm bg-white"
                                    >
                                        <option value="vegetable">Vegetable</option>
                                        <option value="fruit">Fruit</option>
                                        <option value="herb">Herb</option>
                                        <option value="flower">Flower</option>
                                        <option value="tree">Tree</option>
                                    </select>
                                    <input
                                        type="file"
                                        accept="image/svg+xml"
                                        onChange={(e) => setNewPlantIcon(e.target.files[0])}
                                        className="text-sm"
                                    />
                                </div>

                                <div className="mt-4">
                                    <button
                                        onClick={handleAddPlant}
                                        className="bg-forest text-white px-6 py-2 rounded hover:bg-green-800 text-sm"
                                    >
                                        Save New Plant
                                    </button>
                                </div>

                            </div>


                            <div
                                className={`space-y-6 transition-all ${showAllPlants ? 'max-h-[500px] overflow-y-auto pr-2' : ''}`}
                            >

                                {allPlants
                                    .filter(p =>
                                        p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                                        (categoryFilter === 'All' || p.category === categoryFilter)
                                    )
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .slice(0, showAllPlants ? allPlants.length : 4)
                                    .map(plant => (

                                        <div
                                            key={`${plant._id}-${plant.iconData?.slice(0, 6)}`} // triggers refresh
                                            className="p-4 bg-white border rounded shadow-sm flex flex-col sm:flex-row gap-6 sm:items-start"
                                        >
                                            {/* Icon Preview */}
                                            <div className="flex-shrink-0 flex justify-center sm:block">
                                                <img
                                                    src={plantIconPreviews[plant._id] ? plantIconPreviews[plant._id] :
                                                        `data:image/svg+xml;base64,${plant.iconData}`}

                                                    alt={plant.name}
                                                    className="w-14 h-14 mx-auto sm:mx-0"
                                                />
                                            </div>

                                            {/* Editable Fields */}
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    type="text"
                                                    value={plant.name}
                                                    onChange={(e) => handleEditName(plant._id, e.target.value)}
                                                    placeholder="Plant name"
                                                    className="w-full border px-3 py-2 rounded text-sm"
                                                />
                                                <select
                                                    value={editedPlants[plant._id]?.category || plant.category}
                                                    onChange={(e) => handleEditCategory(plant._id, e.target.value)}
                                                    className="w-full border px-3 py-2 rounded text-sm bg-white"
                                                >
                                                    <option value="vegetable">Vegetable</option>
                                                    <option value="fruit">Fruit</option>
                                                    <option value="herb">Herb</option>
                                                    <option value="flower">Flower</option>
                                                    <option value="tree">Tree</option>
                                                </select>
                                            </div>

                                            {/* Controls */}
                                            <div className="flex flex-col gap-2 items-end sm:items-start">
                                                <label className="text-sm font-medium text-forest">Change Icon</label>
                                                <input
                                                    id={`plant-icon-input-${plant._id}`}
                                                    type="file"
                                                    accept="image/svg+xml"
                                                    onChange={(e) => handleEditIcon(plant._id, e.target.files[0])}
                                                    className="text-sm"
                                                />
                                                <button
                                                    onClick={() => handleDeletePlant(plant._id)}
                                                    className="text-red-600 text-sm hover:underline mt-2"
                                                >
                                                    Delete plant
                                                </button>
                                            </div>
                                        </div>

                                    ))
                                }
                            </div>
                            <div className="mt-4 text-center">
                                <button
                                    onClick={() => setShowAllPlants(prev => !prev)}
                                    className="text-sm text-forest underline hover:text-green-800"
                                    type="button"
                                >
                                    {showAllPlants ? 'Show less' : 'Show more'}
                                </button>
                            </div>


                            <div className="mt-8 text-center">
                                <button
                                    type="button"
                                    onClick={handleSavePlantEdits}
                                    className="bg-forest text-white px-6 py-2 rounded hover:bg-green-800"
                                >
                                    Save Plant Changes
                                </button>
                            </div>
                        </div>
                    )}
                    {active === 'Users Settings' && (
                        <div>
                            <h3 className="text-xl font-bold mb-4 text-forest">Users Management</h3>

                            {/* Controls */}
                            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                <input
                                    type="text"
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    placeholder="Search name or email"
                                    className="flex-1 border px-3 py-2 rounded text-sm"
                                />
                                <select
                                    value={userFilter}
                                    onChange={(e) => setUserFilter(e.target.value)}
                                    className="border px-3 py-2 rounded text-sm bg-white"
                                >
                                    <option value="active">Active Users</option>
                                    <option value="inactive">Inactive Users</option>
                                    <option value="deleted">Deleted Users</option>
                                </select>


                            </div>

                            {/* User List */}
                            <div className="space-y-4">
                                {userList.map(user => (
                                    <div
                                        key={user._id}
                                        className="p-4 bg-white border rounded shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center"
                                    >
                                        <div className="flex-1 space-y-1">
                                            {editingUserId === user._id ? (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={editedUsers[user._id]?.name || user.name}
                                                        onChange={(e) =>
                                                            setEditedUsers(prev => ({
                                                                ...prev,
                                                                [user._id]: { ...prev[user._id], name: e.target.value }
                                                            }))
                                                        }
                                                        className="w-full border px-2 py-1 rounded text-sm"
                                                    />
                                                    <input
                                                        type="email"
                                                        value={editedUsers[user._id]?.email || user.email}
                                                        onChange={(e) =>
                                                            setEditedUsers(prev => ({
                                                                ...prev,
                                                                [user._id]: { ...prev[user._id], email: e.target.value }
                                                            }))
                                                        }
                                                        className="w-full border px-2 py-1 rounded text-sm"
                                                    />
                                                    <select
                                                        value={editedUsers[user._id]?.role || user.role}
                                                        onChange={(e) =>
                                                            setEditedUsers(prev => ({
                                                                ...prev,
                                                                [user._id]: { ...prev[user._id], role: e.target.value }
                                                            }))
                                                        }
                                                        className="w-full border px-2 py-1 rounded text-sm bg-white"
                                                    >
                                                        <option value="user">user</option>
                                                        <option value="admin">admin</option>
                                                    </select>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="font-semibold text-forest">{user.name}</p>
                                                    <p className="text-sm text-gray-600">{user.email}</p>
                                                    <p className="text-sm text-gray-500">
                                                        Role: {user.role} | Status: {user.isActive ? 'Active' : 'Inactive'}
                                                    </p>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex gap-4 mt-2 sm:mt-0">
                                            {editingUserId === user._id ? (
                                                <>
                                                    <button
                                                        onClick={() => handleSaveUser(user._id)}
                                                        className="text-green-700 text-sm underline"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => cancelEdit(user._id)}
                                                        className="text-gray-500 text-sm underline"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setEditingUserId(user._id)}
                                                        className="text-sm text-blue-600 underline"
                                                    >
                                                        Edit
                                                    </button>
                                                    {user.role !== 'admin' && (
                                                        <button
                                                            onClick={() => handleDeleteUser(user)}
                                                            className="text-sm text-red-600 underline"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}

                            </div>
                        </div>
                    )}
                    {active === 'Blog Management' && (
                        <div>
                            <h3 className="text-xl font-bold mb-4 text-forest">Blog Management</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Use the button below to access all admin blog tools.
                            </p>
                            <button
                                onClick={() => navigate('/admin/blog')}
                                className="inline-block px-6 py-2 border bg-forest text-white rounded hover:bg-green-800"
                            >
                                Go to Blog Dashboard →
                            </button>
                        </div>
                    )}







                    {/* Other sections remain unchanged */}
                </div>
            </div >
        </div >
    );
}
