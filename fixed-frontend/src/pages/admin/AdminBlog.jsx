import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardHeader from '../../components/DashboardHeader';

export default function AdminBlog() {
    const [posts, setPosts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [viewArchived, setViewArchived] = useState(false);
    const navigate = useNavigate();

    const categoryOptions = ['All', 'Garden', 'Landscaping', 'Vegetables', 'Fruits', 'Trees', 'Permaculture'];

    useEffect(() => {
        const endpoint = viewArchived
            ? 'http://localhost:4000/api/blog/archived'
            : 'http://localhost:4000/api/blog/all';

        fetch(endpoint)
            .then(res => res.json())
            .then(data => {
                if (data.success) setPosts(data.posts);
            });
    }, [viewArchived]);

    const handleDelete = async (slug) => {
        if (!window.confirm(`Delete "${slug}"?`)) return;

        const res = await fetch(`http://localhost:4000/api/blog/delete/${slug}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        const data = await res.json();
        if (data.success) {
            setPosts(prev => prev.filter(post => post.slug !== slug));
        } else {
            alert(data.message || 'Failed to delete post.');
        }
    };

    const handleRestore = async (slug) => {
        const res = await fetch(`http://localhost:4000/api/blog/restore/${slug}`, {
            method: 'PUT',
            credentials: 'include',
        });

        const data = await res.json();
        if (data.success) {
            setPosts(prev => prev.filter(post => post.slug !== slug));
        } else {
            alert(data.message || 'Failed to restore post.');
        }
    };

    const filteredPosts = posts.filter(post => {
        const matchesCategory =
            selectedCategory === '' || selectedCategory === 'All' || post.category === selectedCategory;
        const matchesSearch =
            post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="bg-white min-h-screen text-forest">
            <DashboardHeader />

            <div className="max-w-6xl mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Manage Blog Posts</h1>
                    <Link
                        to="/admin/blog/new"
                        className="bg-forest text-white px-4 py-2 rounded hover:bg-green-800"
                    >
                        + New Post
                    </Link>
                </div>

                {/* View toggle */}
                <div className="flex gap-4 mb-4">
                    <button
                        onClick={() => setViewArchived(false)}
                        className={`px-4 py-2 rounded ${!viewArchived ? 'bg-forest text-white' : 'bg-gray-100'}`}
                    >
                        Published
                    </button>
                    <button
                        onClick={() => setViewArchived(true)}
                        className={`px-4 py-2 rounded ${viewArchived ? 'bg-forest text-white' : 'bg-gray-100'}`}
                    >
                        Archived
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Search posts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 border px-3 py-2 rounded"
                    />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="border px-3 py-2 rounded bg-white"
                    >
                        {categoryOptions.map((cat, i) => (
                            <option key={i} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {filteredPosts.length === 0 ? (
                    <p className="text-gray-500">No matching posts found.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {filteredPosts.map((post, i) => (
                            <div key={i} className="relative group bg-white border rounded overflow-hidden shadow hover:shadow-lg transition">
                                {post.image && (
                                    <img src={post.image} alt={post.title} className="w-full h-48 object-cover" />
                                )}
                                <div className="p-4">
                                    <h3 className="text-lg font-semibold mb-1">{post.title}</h3>
                                    <p className="text-sm text-gray-600 line-clamp-3">{post.excerpt}</p>
                                </div>

                                {/* Hover controls */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-opacity">
                                    {viewArchived ? (
                                        <button
                                            onClick={() => handleRestore(post.slug)}
                                            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
                                        >
                                            Restore
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => navigate(`/admin/blog/edit/${post.slug}`)}
                                                className="bg-yellow-400 text-white px-4 py-1 rounded hover:bg-yellow-500"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(post.slug)}
                                                className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700"
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
