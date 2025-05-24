import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/DashboardHeader';

export default function Home() {
    const [recentPosts, setRecentPosts] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetch('http://localhost:4000/api/blog/all')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const sorted = data.posts
                        .filter(p => !p.isDeleted)
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    setRecentPosts(sorted.slice(0, 6));
                }
            });
    }, []);

    return (
        <div className="bg-white min-h-screen">
            <DashboardHeader />

            <div className="text-center mt-8">
                <h2 className="text-3xl font-bold text-forest mb-4">Welcome to Backyard Garden!</h2>
                <p className="text-gray-600 max-w-xl mx-auto mb-10">
                    This is a gardening website created by gardener and mother Ana Berehorschi. Here you can explore helpful guides, create your own designs, check the local weather, and schedule your daily tasks.

                </p>
            </div>

            {/* Recent Blog Posts */}
            <div className="max-w-7xl mx-auto p-6">
                <h3 className="text-2xl font-bold text-forest mb-4">Recent Blog Posts</h3>

                {recentPosts.length === 0 ? (
                    <p className="text-gray-500">No recent posts yet.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {recentPosts.map((post, i) => (
                            <div
                                key={i}
                                onClick={() => navigate(`/blog/${post.slug}`)}
                                className="cursor-pointer bg-white border rounded shadow hover:shadow-lg transition"
                            >
                                <img
                                    src={post.image || 'https://via.placeholder.com/600x400?text=No+Image'}
                                    alt={post.title}
                                    className="w-full h-48 object-cover"
                                />
                                <div className="p-4">
                                    <h4 className="font-semibold text-lg text-forest mb-2">{post.title}</h4>
                                    <p className="text-sm text-gray-600 line-clamp-2">{post.excerpt}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
