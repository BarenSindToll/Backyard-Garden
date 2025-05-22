import DashboardHeader from '../components/DashboardHeader';
import { useEffect, useState } from 'react';

export default function BlogPage() {
    const [posts, setPosts] = useState([]);

    useEffect(() => {

    }, []);

    return (
        <div className="bg-white min-h-screen text-forest">
            <DashboardHeader />
            <div className="max-w-6xl mx-auto p-6">
                <h1 className="text-2xl font-bold text-center mb-8">Recent blog articles</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map((post, i) => (
                        <div key={i} className="group">
                            <img
                                src={post.image}
                                alt={post.title}
                                className="w-full h-60 object-cover rounded"
                            />
                            <h3 className="text-lg font-semibold mt-4">{post.title}</h3>
                            <p className="text-sm text-gray-700 mt-2">{post.excerpt}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
