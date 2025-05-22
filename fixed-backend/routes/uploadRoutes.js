import express from 'express';
import multer from 'multer';
import path from 'path';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) =>
        cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

router.post('/image', upload.single('image'), (req, res) => {
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
});

export default router;
