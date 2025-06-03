// routes/gardenStructures.js
import express from 'express';
import {
    getAllStructures,
    createStructure,
    updateStructure,
    deleteStructure,
} from '../controllers/gardenStructureController.js';
import verifyToken from '../middleware/verifyToken.js';

const router = express.Router();

// Get all structures for logged-in user
router.get('/', verifyToken, getAllStructures);

// Create a new structure
router.post('/', verifyToken, createStructure);

// Update a structure by ID
router.put('/:id', verifyToken, updateStructure);

// Delete a structure by ID
router.delete('/:id', verifyToken, deleteStructure);

export default router;
