import express from 'express';
import { getArchivedPosts, restorePost, deletePost, getAllPosts, getPostBySlug, createPost, updatePost } from '../controllers/blogPostController.js';
import { adminCheck } from '../middleware/adminCheck.js';
import verifyToken from '../middleware/verifyToken.js';

const router = express.Router();

router.get('/all', getAllPosts);
router.get('/archived', getArchivedPosts);
router.get('/:slug', getPostBySlug);
router.post('/create', verifyToken, adminCheck, createPost);
router.put('/update-by-id/:id', verifyToken, adminCheck, updatePost);
router.delete('/delete/:slug', verifyToken, adminCheck, deletePost);
router.put('/restore/:slug', verifyToken, adminCheck, restorePost);

export default router;
