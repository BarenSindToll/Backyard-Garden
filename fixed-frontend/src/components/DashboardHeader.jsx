import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

export default function DashboardHeader() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [blogOpen, setBlogOpen] = useState(false);
    const [user, setUser] = useState(null);
    const menuRef = useRef();
    const blogRef = useRef();
    const navigate = useNavigate();
    const location = useLocation();

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
                if (data.success) setUser(data.userData);
            } catch (error) {
                console.error('Failed to fetch user:', error);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
            if (!blogRef.current?.contains(e.target)) setBlogOpen(false);
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
        <>
            <header className="w-full bg-white border-b shadow-sm px-6 py-4 flex justify-between items-center">
                {/* Brand */}
                <Link to="/home" className="text-2xl font-semibold text-forest hover:opacity-80">
                    Backyard Garden
                </Link>

                {/* Navigation */}
                <div className="flex items-center gap-6 text-sm text-forest">
                    {/* Blog Dropdown */}
                    <div className="relative" ref={blogRef}>
                        <button onClick={() => setBlogOpen(!blogOpen)} className="hover:underline focus:outline-none">
                            Blog ▾
                        </button>
                        {blogOpen && (
                            <div className="absolute left-0 mt-2 w-56 bg-white shadow-lg rounded-lg border p-2 z-10">
                                {[
                                    'Vegetable garden',
                                    'Flower garden',
                                    'Fruit plants',
                                    'Herb garden',
                                    'Indoor plants',
                                    'Landscaping',
                                    'Lifestyle',
                                ].map((cat) => (
                                    <Link
                                        key={cat}
                                        to={`/blog/${cat.toLowerCase().replace(/ /g, '-')}`}
                                        className="block px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                                    >
                                        {cat}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <Link to="/garden-layout" className="hover:underline">Garden Layout</Link>
                    <Link to="/calendar" className="hover:underline">Calendar</Link>
                    <Link to="/weather" className="hover:underline">Weather Forecast</Link>

                    {/* Profile Icon and Menu */}
                    <div className="relative" ref={menuRef}>
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
                                    {user?.name ? user.name[0] : '?'}
                                </div>
                            )}
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg border p-2 z-10">
                                <div className="px-4 py-2 text-xs text-gray-500 border-b mb-2">
                                    {user?.name ? `Hello, ${user.name}` : `ID: ${localStorage.getItem('userId')}`}
                                </div>
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
                </div>
            </header>

            {/* Banner image for homepage only */}
            {location.pathname === '/home' && (
                <img
                    src="/banner.jpg"
                    alt="Garden Banner"
                    className="w-full h-50 object-cover"
                />
            )}
        </>
    );
}
