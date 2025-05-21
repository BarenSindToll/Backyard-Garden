import Calendar from '../models/calendarModel.js';

export const loadCalendar = async (req, res) => {
    try {
        const userId = req.user.id;
        let calendar = await Calendar.findOne({ userId });
        if (!calendar) {
            calendar = await Calendar.create({ userId, tasks: [] });
        }
        res.json({ success: true, tasks: calendar.tasks });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const saveCalendar = async (req, res) => {
    try {
        const userId = req.user.id;
        const { tasks } = req.body;

        const updated = await Calendar.findOneAndUpdate(
            { userId },
            { tasks },
            { new: true, upsert: true }
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
