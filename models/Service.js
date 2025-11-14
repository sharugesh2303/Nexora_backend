import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema({
    icon: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    desc: {
        type: String,
        required: true
    }
});

// This will create a collection named 'services' in your database
export default mongoose.model('service', ServiceSchema);