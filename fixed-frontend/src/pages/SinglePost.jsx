import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DashboardHeader from '../components/DashboardHeader';

export default function SinglePostPage() {
    const { slug } = useParams();
    const navigate = useNavigate();

    const [post, setPost] = useState(null);
    const [relatedPosts, setRelatedPosts] = useState([]);
    const [prevPost, setPrevPost] = useState(null);
    const [nextPost, setNextPost] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:4000/api/blog/${slug}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setPost(data.post);
                } else {
                    setPost(null);
                }
            });
    }, [slug]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    useEffect(() => {
        if (post?.category) {
            fetch('http://localhost:4000/api/blog/all')
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        const posts = data.posts.filter(p => p.isDeleted !== true);
                        const currentIndex = posts.findIndex(p => p.slug === slug);
                        if (currentIndex > 0) setPrevPost(posts[currentIndex - 1]);
                        if (currentIndex < posts.length - 1) setNextPost(posts[currentIndex + 1]);

                        const related = posts.filter(p =>
                            p.category === post.category && p.slug !== post.slug
                        );
                        setRelatedPosts(related.slice(0, 3));
                    }
                });
        }
    }, [post, slug]);

    if (!post) {
        return (
            <div className="bg-white min-h-screen text-forest">
                <DashboardHeader />
                <div className="max-w-4xl mx-auto p-6">
                    <p className="text-gray-500">Post not found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen text-forest">
            <DashboardHeader />
            <div className="max-w-4xl mx-auto p-6">
                {post.image && (
                    <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-64 object-cover rounded mb-6"
                    />
                )}
                <h1 className="text-3xl font-bold mb-1">{post.title}</h1>
                <p className="text-sm text-gray-500">
                    📅 Published on {new Date(post.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </p>
                <p className="text-sm text-gray-500 mb-6">Category: {post.category}</p>


                <article
                    className="prose prose-forest max-w-none"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />

                {/* Social Share */}
                <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-2">Share this post</h3>
                    <div className="flex gap-3">
                        <a
                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            Facebook
                        </a>
                        <a
                            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 hover:underline"
                        >
                            Twitter
                        </a>
                        <a
                            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 hover:underline"
                        >
                            LinkedIn
                        </a>
                    </div>
                </div>

                {/* Prev/Next */}
                <div className="mt-12 flex justify-between items-center text-sm">
                    {prevPost && (
                        <button
                            onClick={() => navigate(`/blog/${prevPost.slug}`)}
                            className="text-forest hover:underline"
                        >
                            ← {prevPost.title}
                        </button>
                    )}
                    {nextPost && (
                        <button
                            onClick={() => navigate(`/blog/${nextPost.slug}`)}
                            className="text-forest hover:underline ml-auto"
                        >
                            {nextPost.title} →
                        </button>
                    )}
                </div>

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                    <div className="mt-12">
                        <h3 className="text-xl font-bold mb-4">Related Posts</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {relatedPosts.map((rPost, i) => (
                                <div
                                    key={i}
                                    onClick={() => navigate(`/blog/${rPost.slug}`)}
                                    className="cursor-pointer bg-white border rounded shadow hover:shadow-md transition"
                                >
                                    {rPost.image && (
                                        <img
                                            src={rPost.image}
                                            alt={rPost.title}
                                            className="w-full h-40 object-cover"
                                        />
                                    )}
                                    <div className="p-3">
                                        <h4 className="font-semibold text-md">{rPost.title}</h4>
                                        <p className="text-sm text-gray-600 line-clamp-2">
                                            {rPost.excerpt}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
