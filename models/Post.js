import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    summary: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    headerImage: {
        type: String
    },
    author: {
        type: String,
        default: 'NEXORA Admin'
    },
    date: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('post', PostSchema);