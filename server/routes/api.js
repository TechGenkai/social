// API routes for posts, chats, profiles, and theories
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/posts', auth, upload.single('media'), async (req, res) => {
    try {
        const { content, type, tags, collaborators, location, poll } = req.body;
        const post = new Post({
            userId: req.user.id,
            content,
            type,
            tags: tags ? JSON.parse(tags) : [],
            collaborators: collaborators ? JSON.parse(collaborators) : [],
            location: location ? JSON.parse(location) : null,
            media: req.file ? `/uploads/${req.file.filename}` : null,
            poll: poll ? JSON.parse(poll) : null
        });
        await post.save();
        res.status(201).json(post);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/posts/comment', auth, async (req, res) => {
    try {
        const { postId, content, stickers } = req.body;
        const comment = new Comment({
            postId,
            userId: req.user.id,
            content,
            stickers: stickers || []
        });
        await comment.save();
        await Post.findByIdAndUpdate(postId, { $push: { comments: comment } });
        res.status(201).json(comment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/posts/repost', auth, async (req, res) => {
    try {
        const { postId } = req.body;
        await Post.findByIdAndUpdate(postId, { $push: { reposts: req.user.id } });
        res.status(200).json({ message: 'Reposted' });
    } catch (error) {
        console.error('Error reposting:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/posts/bookmark', auth, async (req, res) => {
    try {
        const { postId } = req.body;
        await Post.findByIdAndUpdate(postId, { $push: { bookmarks: req.user.id } });
        res.status(200).json({ message: 'Bookmarked' });
    } catch (error) {
        console.error('Error bookmarking:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/tags/trending', async (req, res) => {
    try {
        const tags = await Post.aggregate([
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        res.json(tags.map(tag => tag._id));
    } catch (error) {
        console.error('Error fetching trending tags:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/chats/message', auth, async (req, res) => {
    try {
        const { chatId, message, voicePack } = req.body;
        const chat = await Chat.findById(chatId);
        const user = await User.findById(req.user.id);
        chat.messages.push({ 
            userId: req.user.id, 
            content: message, 
            voicePack, 
            createdAt: new Date() 
        });
        await chat.save();
        io.to(chatId).emit('message', { user: user.username, message, voicePack, chatId });
        res.status(201).json({ message: 'Message sent' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/chats/group', auth, async (req, res) => {
    try {
        const chat = new Chat({
            type: 'group',
            participants: [req.user.id],
            messages: []
        });
        await chat.save();
        res.status(201).json({ chatId: chat._id });
    } catch (error) {
        console.error('Error creating group chat:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/chats/ai', auth, async (req, res) => {
    try {
        const chat = new Chat({
            type: 'ai',
            participants: [req.user.id, 'AI'],
            messages: [{ userId: 'AI', content: 'Hello! I’m your AI buddy!', createdAt: new Date() }]
        });
        await chat.save();
        res.status(201).json({ chatId: chat._id });
    } catch (error) {
        console.error('Error creating AI chat:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/chats/poll', auth, async (req, res) => {
    try {
        const { chatId, question, options } = req.body;
        const chat = await Chat.findById(chatId);
        chat.polls.push({ question, options, votes: [] });
        await chat.save();
        res.status(201).json({ message: 'Poll created' });
    } catch (error) {
        console.error('Error creating poll:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/theories', auth, async (req, res) => {
    try {
        const { content } = req.body;
        const post = new Post({
            userId: req.user.id,
            content,
            type: 'theory'
        });
        await post.save();
        res.status(201).json(post);
    } catch (error) {
        console.error('Error posting theory:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/theories', async (req, res) => {
    try {
        const theories = await Post.find({ type: 'theory' }).sort({ createdAt: -1 });
        res.json(theories);
    } catch (error) {
        console.error('Error fetching theories:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json(user.profile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/profile/story', auth, upload.single('media'), async (req, res) => {
    try {
        const media = req.file ? `/uploads/${req.file.filename}` : null;
        await User.findByIdAndUpdate(req.user.id, {
            $push: { 'profile.stories': { media, createdAt: new Date() } }
        });
        res.status(201).json({ message: 'Story added' });
    } catch (error) {
        console.error('Error adding story:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/profile/note', auth, async (req, res) => {
    try {
        const { content } = req.body;
        await User.findByIdAndUpdate(req.user.id, {
            $push: { 'profile.notes': content }
        });
        res.status(201).json({ message: 'Note added' });
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
