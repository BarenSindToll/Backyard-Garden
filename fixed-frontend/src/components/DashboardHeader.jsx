import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

export default function DashboardHeader() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [user, setUser] = useState(null);
    const menuRef = useRef();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch('http://localhost:4000/api/user/get-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ userId: localStorage.getItem('userId') }),
                });
                const data = await res.json();
                if (data.success) {
                    console.log('User Data:', data.userData); //debug
                    setUser(data.userData);
                }
            } catch (error) {
                console.error('Failed to fetch user:', error);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            const res = await fetch('http://localhost:4000/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
            const data = await res.json();
            if (data.success) {
                localStorage.removeItem('userId');
                navigate('/signin');
            }
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <header className="flex items-center justify-between px-6 py-4 relative">
            <div className="flex-1 text-center">
                <h1 className="text-3xl font-bold text-forest">Backyard Garden</h1>
            </div>

            <div className="absolute right-6 top-6" ref={menuRef}>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="focus:outline-none"
                >
                    {user?.profileImage ? (
                        <img
                            src={`http://localhost:4000${user.profileImage}`}
                            alt="Profile"
                            className="w-10 h-10 rounded-full object-cover border-2 border-forest"
                        />
                    ) : (
                        <div className="w-10 h-10 bg-forest text-white flex items-center justify-center rounded-full text-sm">
                            ?
                        </div>
                    )}
                </button>

                {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg border p-2 z-10">
                        {user?.name ? (
                            <div className="px-4 py-2 text-sm text-gray-700 font-medium border-b mb-2">
                                Hello, {user.name}
                            </div>
                        ) : (
                            <div className="px-4 py-2 text-xs text-gray-500 border-b mb-2">
                                Hello, ID: {localStorage.getItem('userId')}
                            </div>
                        )}

                        <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100 text-forest">
                            Profile Settings
                        </Link>
                        <Link to="/help" className="block px-4 py-2 hover:bg-gray-100 text-forest">
                            Help
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                        >
                            Log out
                        </button>
                    </div>
                )}


            </div>
        </header>
    );
}
