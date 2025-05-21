import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    date: String,
    title: String,
    color: String,
});

const calendarSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    tasks: [taskSchema],
});

export default mongoose.models.Calendar || mongoose.model('Calendar', calendarSchema);
