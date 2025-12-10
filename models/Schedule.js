import mongoose from 'mongoose';

const ScheduleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        trim: true
    },
    mobile: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'is invalid']
    },
    message: {
        type: String
    },
    meetingDate: {
        type: Date,
        required: true
    },
    meetingTime: {
        type: String, // Storing time as a string (e.g., "14:30")
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    dateSubmitted: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('schedule', ScheduleSchema);