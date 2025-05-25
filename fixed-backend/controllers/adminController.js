import User from '../models/userModel.js';

// GET /api/admin/users?search=name&sort=name|email|createdAt
export const getAllUsers = async (req, res) => {
    try {
        const { filter = 'active', search = '', sort = 'createdAt' } = req.query;

        let query = {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        };

        if (filter === 'active') query.isActive = true;
        else if (filter === 'inactive') query.isActive = false;
        else if (filter === 'deleted') query.isDeleted = true;

        const users = await User.find(query)
            .sort({ [sort]: 1 })
            .select('-password');

        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// PUT /api/admin/users/:id/toggle
export const toggleUserActive = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot deactivate admin' });

        user.isActive = !user.isActive;
        await user.save();

        res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/admin/announce
export const sendAnnouncement = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'Message required' });

        // Placeholder logic (email integration goes here)
        console.log("Sending announcement:", message);

        res.json({ success: true, message: 'Announcement sent to all users' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


export const updateUser = async (req, res) => {
    try {
        const { name, email, role } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (role && !['user', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;
        if (role !== undefined) user.role = role;

        await user.save();

        res.json({ success: true, message: 'User updated', user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(403).json({ success: false, message: 'Cannot delete the last admin' });
            }
        }

        await User.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'User permanently deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

