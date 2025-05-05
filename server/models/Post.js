// Post schema for MongoDB
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    content: { type: String },
    type: { type: String, enum: ['text', 'image', 'video', 'gif', 'poll', 'collaborative', 'theory'] },
    media: { type: String },
    tags: [String],
    collaborators: [String],
    location: { lat: Number, lon: Number },
    poll: { question: String, options: [String], votes: [{ userId: String, option: String }] },
    likes: [{ type: String }],
    reposts: [{ type: String }],
    bookmarks: [{ type: String }],
    comments: [{
        userId: String,
        content: String,
        stickers: [String],
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
