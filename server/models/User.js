// User schema for MongoDB
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profile: {
        stories: [{ media: String, createdAt: { type: Date, default: Date.now } }],
        notes: [String],
        reactions: [{ postId: String, type: String }]
    }
});

module.exports = mongoose.model('User', userSchema);