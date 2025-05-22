import BlogPost from '../models/blogPostModel.js';
import slugify from 'slugify';

// GET /api/blog/all
export const getAllPosts = async (req, res) => {
    try {
        const posts = await BlogPost.find().sort({ createdAt: -1 });
        res.json({ success: true, posts });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/blog/:slug
export const getPostBySlug = async (req, res) => {
    try {
        const post = await BlogPost.findOne({ slug: req.params.slug });
        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
        res.json({ success: true, post });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


export const createPost = async (req, res) => {
    const { title, image, excerpt, content, category } = req.body;

    try {
        const slug = slugify(title, { lower: true, strict: true });
        const newPost = new BlogPost({ title, slug, image, excerpt, content, category });
        await newPost.save();
        res.json({ success: true, post: newPost });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


export const updatePost = async (req, res) => {
    try {
        const { title, slug, image, excerpt, content, category } = req.body;

        const updated = await BlogPost.findByIdAndUpdate(
            req.params.id,
            { title, slug, image, excerpt, content, category },
            { new: true }
        );

        if (!updated) return res.status(404).json({ success: false, message: 'Post not found' });

        res.json({ success: true, post: updated });
    } catch (err) {
        console.error('Update error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};


export const deletePost = async (req, res) => {
    try {
        const post = await BlogPost.findOneAndDelete({ slug: req.params.slug });

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        res.json({ success: true, message: 'Post deleted successfully' });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};