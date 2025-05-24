import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../../components/DashboardHeader';
import AdminPostEditor from '../../components/AdminPostEditor';



export default function NewBlogPost() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [image, setImage] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [content, setContent] = useState('');
    const quillRef = useRef();
    const [thumbnailPreview, setThumbnailPreview] = useState('');
    const categoryOptions = ['Garden', 'Landscaping', 'Vegetables', 'Fruits', 'Trees', 'Permaculture'];

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


    // Drag & drop handler
    useEffect(() => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        const handleDrop = async (e) => {
            e.preventDefault();
            e.stopPropagation();

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
                const range = quill.getSelection();
                const index = range?.index || quill.getLength();
                quill.insertEmbed(index, 'image', `http://localhost:4000${data.url}`);
                quill.setSelection(index + 1);
            }
        };

        const editor = quill.root;
        editor.addEventListener('drop', handleDrop);

        return () => {
            editor.removeEventListener('drop', handleDrop);
        };
    }, []);

    const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            const formData = new FormData();
            formData.append('image', file);

            const res = await fetch('http://localhost:4000/api/upload/image', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                const quill = quillRef.current.getEditor();
                const range = quill.getSelection();
                quill.insertEmbed(range.index, 'image', `http://localhost:4000${data.url}`);
            }
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const res = await fetch('http://localhost:4000/api/blog/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title, category, image, excerpt, content }),
        });

        const data = await res.json();
        if (data.success) {
            navigate('/admin/blog');
        } else {
            alert(data.message || 'Failed to create post');
        }
    };

    return (
        <div className="bg-white min-h-screen text-forest">
            <DashboardHeader />
            <div className="max-w-4xl mx-auto p-6">
                <h1 className="text-2xl font-bold mb-4">New Blog Post</h1>
                <form onSubmit={handleSubmit} className="space-y-4">

                    <input
                        type="text"
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
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
                            <img src={thumbnailPreview} alt="Thumbnail preview" className="h-full object-contain" />
                        ) : (
                            <span>Drag & drop a thumbnail image here</span>
                        )}
                    </div>
                    <textarea
                        placeholder="Short summary"
                        value={excerpt}
                        onChange={(e) => setExcerpt(e.target.value)}
                        className="w-full border px-3 py-2 rounded"
                        rows="2"
                    />


                    <AdminPostEditor content={content} setContent={setContent} />


                    <button
                        type="submit"
                        className="bg-forest text-white px-6 py-2 rounded hover:bg-green-800"
                    >
                        Publish Post
                    </button>
                </form>
            </div>
        </div>
    );
}
