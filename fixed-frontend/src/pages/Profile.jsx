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


    useEffect(() => {
        const fetchName = async () => {
            const res = await fetch('http://localhost:4000/api/user/get-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId })
            });
            const data = await res.json();
            if (data.success) setName(data.userData.name);
        };
        fetchName();
    }, [userId]);

    const handleSave = async (e) => {
        e.preventDefault();

        // update name
        const nameRes = await fetch('http://localhost:4000/api/user/update-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userId, name }),
        });

        const nameData = await nameRes.json();

        // update password (only if filled)
        let passwordData = { success: true };
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }

            const passRes = await fetch('http://localhost:4000/api/user/update-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId, newPassword }),
            });
            passwordData = await passRes.json();
        }

        if (nameData.success && passwordData.success) {
            alert('Changes saved!');
            window.location.reload();
        } else {
            alert(nameData.message || passwordData.message || 'Failed to save.');
        }
    };




    const handleNameSave = async (e) => {
        e.preventDefault();
        const res = await fetch('http://localhost:4000/api/user/update-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userId, name })
        });
        const data = await res.json();
        if (data.success) {
            alert('Name updated!');
            window.location.reload(); // Ensure DashboardHeader picks it up
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        const formData = new FormData();
        formData.append('profileImage', selectedFile);
        formData.append('userId', userId);

        const res = await fetch('http://localhost:4000/api/user/upload-profile-image', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            alert('Photo uploaded!');
            window.location.reload();
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
                                <div>
                                    <label className="block text-sm font-medium mb-1">Profile Photo</label>
                                    {preview && (
                                        <img
                                            src={preview}
                                            alt="Preview"
                                            className="w-20 h-20 object-cover rounded-full mb-2"
                                        />
                                    )}
                                    <input type="file" accept="image/*" onChange={handleFileChange} />
                                    {selectedFile && (
                                        <button
                                            type="button"
                                            onClick={handleUpload}
                                            className="mt-2 bg-forest text-white px-4 py-1 rounded text-sm"
                                        >
                                            Upload Photo
                                        </button>
                                    )}
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
                                    <label className="block text-sm font-medium">Email</label>
                                    <input
                                        type="email"
                                        className="w-full border px-3 py-2 rounded"
                                        placeholder="your@email.com"
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
                    )}

                    {/* Other sections remain unchanged */}
                </div>
            </div>
        </div>
    );
}
