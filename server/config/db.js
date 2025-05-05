require('dotenv').config();
const mongoose = require("mongoose")

// Use either local MongoDB or MongoDB Atlas
const DB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/registration"

mongoose.connect(DB_URI)
.then(()=>{
    console.log("MongoDB connected successfully");
})
.catch((err)=>{
    console.log("Failed to connect to MongoDB");
    console.error(err);
})

const LoginSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique: true,
        maxlength: 15
    },
    password:{
        type:String,
        required:true,
        minlength: 8
    },
    displayName: {
        type: String,
        maxlength: 15
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other']
    },
    dateOfBirth: {
        type: Date
    },
    profilePic: {
        type: String
    },
    lastSeen: {
        type: Date,
        default: Date.now
    }
})

// Chat message schema
const MessageSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        ref: 'collection1'
    },
    text: {
        type: String,
        required: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
        enum: ['user', 'system'],
        default: 'user'
    },
    media: {
        url: { type: String },
        type: { type: String },
        name: { type: String }
    },
    replyTo: {
        messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
        text: { type: String },
        username: { type: String },
        timestamp: { type: Date }
    },
    reactions: [{
        emoji: { type: String, required: true },
        username: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }]
})

// Direct message schema for private messages
const DirectMessageSchema = new mongoose.Schema({
    sender: {
        type: String,
        required: true,
        ref: 'collection1'
    },
    recipient: {
        type: String,
        required: true,
        ref: 'collection1'
    },
    text: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    read: {
        type: Boolean,
        default: false
    },
    media: {
        url: { type: String },
        type: { type: String }
    },
    replyTo: {
        messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'DirectMessage' },
        text: { type: String },
        username: { type: String },
        timestamp: { type: Date }
    },
    reactions: [{
        emoji: { type: String, required: true },
        username: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }]
})

// Conversation schema to track message threads between users
const ConversationSchema = new mongoose.Schema({
    participants: {
        type: [String],
        required: true
    },
    lastMessage: {
        type: String
    },
    lastMessageTime: {
        type: Date
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
})

// Friend request schema
const FriendRequestSchema = new mongoose.Schema({
    sender: {
        type: String,
        required: true,
        ref: 'collection1'
    },
    recipient: {
        type: String,
        required: true,
        ref: 'collection1'
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
})

// Friends schema
const FriendSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true,
        ref: 'collection1'
    },
    friend: {
        type: String,
        required: true,
        ref: 'collection1'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const collection = new mongoose.model("collection1", LoginSchema)
const Message = new mongoose.model("Message", MessageSchema)
const DirectMessage = new mongoose.model("DirectMessage", DirectMessageSchema)
const Conversation = new mongoose.model("Conversation", ConversationSchema)
const FriendRequest = new mongoose.model("FriendRequest", FriendRequestSchema)
const Friend = new mongoose.model("Friend", FriendSchema)

module.exports = {
    collection,
    Message,
    DirectMessage,
    Conversation,
    FriendRequest,
    Friend
}