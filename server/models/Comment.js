// Comment schema for MongoDB
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    postId: { type: String, required: true },
    userId: { type: String, required: true },
    content: { type: String },
    stickers: [String],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema);

