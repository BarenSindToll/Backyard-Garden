import mongoose from 'mongoose';

const blogPostSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, unique: true, required: true }, // url of title
    image: { type: String },
    excerpt: { type: String }, // preview of the post
    content: { type: String }, // full HTML or markdown
    category: { type: String },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.blogPost || mongoose.model('BlogPost', blogPostSchema);
