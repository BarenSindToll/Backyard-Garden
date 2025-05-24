import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardHeader from '../../components/DashboardHeader';
import AdminPostEditor from '../../components/AdminPostEditor';
import slugify from 'slugify';

export default function EditBlogPost() {
    const { slug } = useParams();
    const navigate = useNavigate();

    const [postId, setPostId] = useState('');
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [image, setImage] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [content, setContent] = useState('');
    const [thumbnailPreview, setThumbnailPreview] = useState('');

    const categoryOptions = ['Garden', 'Landscaping', 'Vegetables', 'Fruits', 'Trees', 'Permaculture'];

    useEffect(() => {
        fetch(`http://localhost:4000/api/blog/${slug}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const post = data.post;
                    setPostId(post._id);
                    setTitle(post.title);
                    setCategory(post.category);
                    setImage(post.image);
                    setExcerpt(post.excerpt);
                    setContent(post.content); // ✅ Preload content
                    setThumbnailPreview(post.image);
                } else {
                    alert(data.message || 'Post not found');
                }
            });
    }, [slug]);

    const handleThumbnailDrop = async (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith('image/')) return;

        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch('http://localhost:4000/api/upload/image', {
            method: 'POST',
            body: formData,
        });

        const data = await res.json();
        if (data.success) {
            const fullUrl = `http://localhost:4000${data.url}`;
            setImage(fullUrl);
            setThumbnailPreview(fullUrl);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newSlug = slugify(title, { lower: true, strict: true });

        const res = await fetch(`http://localhost:4000/api/blog/update-by-id/${postId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title, slug: newSlug, category, image, excerpt, content }),
        });

        const data = await res.json();
        if (data.success) {
            navigate('/admin/blog');
        } else {
            alert(data.message || 'Failed to update post');
        }
    };

    return (
        <div className="bg-white min-h-screen text-forest">
            <DashboardHeader />
            <div className="max-w-4xl mx-auto p-6">
                <h1 className="text-2xl font-bold mb-4">Edit Blog Post</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                        placeholder="Title"
                        required
                    />

                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full border px-3 py-2 rounded bg-white"
                        required
                    >
                        <option value="" disabled>Select a category</option>
                        {categoryOptions.map((cat, i) => (
                            <option key={i} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <div
                        onDrop={handleThumbnailDrop}
                        onDragOver={handleDragOver}
                        className="w-full h-40 border-2 border-dashed rounded flex items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50"
                    >
                        {thumbnailPreview ? (
                            <img src={thumbnailPreview} alt="Thumbnail" className="h-full object-contain" />
                        ) : (
                            <span>Drag & drop a thumbnail image here</span>
                        )}
                    </div>

                    <textarea
                        value={excerpt}
                        onChange={(e) => setExcerpt(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                        rows="2"
                        placeholder="Short summary"
                    />

                    <AdminPostEditor content={content} setContent={setContent} />

                    <button
                        type="submit"
                        className="bg-forest text-white px-6 py-2 rounded hover:bg-green-800"
                    >
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
}
