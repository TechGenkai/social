// Chat schema for MongoDB
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    type: { type: String, enum: ['personal', 'group', 'ai'], required: true },
    participants: [{ type: String }],
    messages: [{
        userId: String,
        content: String,
        emojis: [String],
        stickers: [String],
        voicePack: String,
        createdAt: { type: Date, default: Date.now }
    }],
    polls: [{
        question: String,
        options: [String],
        votes: [{ userId: String, option: String }],
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', chatSchema);
