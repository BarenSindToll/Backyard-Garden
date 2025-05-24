import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/DashboardHeader';

export default function BlogPage() {
    const [posts, setPosts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const navigate = useNavigate();

    const categoryOptions = ['All', 'Garden', 'Landscaping', 'Vegetables', 'Fruits', 'Trees', 'Permaculture'];

    useEffect(() => {
        fetch('http://localhost:4000/api/blog/all')
            .then(res => res.json())
            .then(data => {
                if (data.success) setPosts(data.posts);
            });
    }, []);

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
                <h1 className="text-2xl font-bold mb-6">Explore Our Blog</h1>

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
                            <div
                                key={i}
                                onClick={() => navigate(`/blog/${post.slug}`)}
                                className="cursor-pointer bg-white border rounded overflow-hidden shadow hover:shadow-lg transition"
                            >
                                {post.image && (
                                    <img src={post.image} alt={post.title} className="w-full h-48 object-cover" />
                                )}
                                <div className="p-4">
                                    <h3 className="text-lg font-semibold mb-1">{post.title}</h3>
                                    <p className="text-sm text-gray-600 line-clamp-3">{post.excerpt}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
