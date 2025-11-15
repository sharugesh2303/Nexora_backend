import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        // Making mobile required as per the form setup
        required: true 
    },
    message: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    date: {
        type: Date,
        default: Date.now
    }
});

// This will create a collection named 'messages' in your database
export default mongoose.model('message', MessageSchema);