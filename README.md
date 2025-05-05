## README.md

# Social Media Website

A full-stack social media platform built with separate HTML, CSS, and JavaScript files, using Express.js and MongoDB for the backend. Features include camera, chat, calls, posts, profiles, and fan theories.

## Features

- **Camera**: Capture photos and videos with download functionality.
- **Chat**: Personal, group, and AI chats with voice packs, emojis, stickers, polls, and walkie-talkie (simulated).
- **Call**: Personal, video, and screen sharing calls; group calls require WebRTC setup.
- **Post**: Text, image, video, GIF, polls, collaborative posts, reposts, bookmarks, and auto-location.
- **Tags**: Trending tags displayed in feed.
- **Theme**: Basic CSS theming, split into separate files per page.
- **Comment**: Text and stickers in comments.
- **Profile**: Stories, notes, and reactions with media upload.
- **AI Chatbot**: Simple greeting-based AI chat.
- **Auto Locate**: Optional geolocation for posts.
- **Download**: For camera outputs and post media.
- **Fan Theory Page**: Dedicated page for posting and viewing fan theories.
- **Community/Mention**: Collaborators in posts act as mentions; community via group chats.

## Prerequisites

- Node.js (v16+)
- MongoDB (running locally or via cloud)
- Optional: MySQL (for alternative database)

## Setup Instructions

### Backend

1. Navigate to `server/`:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with:
   ```
   MONGO_URI=mongodb://localhost:27017/social-media
   PORT=3000
   JWT_SECRET=your_jwt_secret
   ```
4. Create an `uploads/` folder in `server/` for file storage:
   ```bash
   mkdir uploads
   ```
5. Start the server:
   ```bash
   npm start
   ```

### Frontend

1. Navigate to `client/`:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend server:
   ```bash
   npm start
   ```
4. Access the site at `http://localhost:5000`.

### MySQL Integration (Optional)

1. Install MySQL and `mysql2`:
   ```bash
   npm install mysql2
   ```
2. Update `server/config/db.js`:
   ```javascript
   const mysql = require("mysql2");
   const connection = mysql.createConnection({
     host: "localhost",
     user: "your_user",
     password: "your_password",
     database: "social_media",
   });
   module.exports = connection;
   ```
3. Modify routes in `server/routes/api.js` to use SQL queries instead of Mongoose.

## Maintenance Tips

- **Separate HTML/CSS/JS**: HTML files are in `client/public/`, CSS in `client/src/css/`, and JavaScript in `client/src/js/` for clear organization.
- **Modular Code**: JavaScript is split by feature (e.g., `camera.js`, `chat.js`) for easy updates.
- **CSS Organization**: Use `base.css` for global styles and page-specific files (`main.css`, `profile.css`, etc.) for targeted styling.
- **Error Handling**: Backend routes and frontend scripts include logging for debugging.
- **Environment Variables**: Store sensitive data in `server/.env`.
- **File Uploads**: Multer handles media with a 5MB limit and type restrictions; adjust in `middleware/upload.js`.
- **Scalability**: Add MongoDB indexes (e.g., on `Post.tags`) for performance.
- **Extending Features**:
  - Add voice packs in `client/src/assets/voice-packs/`.
  - Enhance polls with voting UI in `chat.js` and `post.js`.
  - Implement group calls with a WebRTC signaling server.
  - Add username validation for collaborative posts in `routes/api.js`.

## Notes

- **Media Uploads**: Stored in `server/uploads/`; ensure write permissions.
- **Walkie Talkie**: Simulated as voice pack messages; full implementation requires real-time audio streaming.
- **Group Calls**: Require a WebRTC setup for full functionality.
- **Polls**: Stored in database but lack interactive voting; extend with UI logic.
- **Authentication**: Register/login required for most features; tokens expire after 1 hour.
