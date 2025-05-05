const express = require('express')
const app = express()
const path = require('path')
const { collection, Message, DirectMessage, Conversation, FriendRequest, Friend } = require("./mongodb")
const multer = require('multer')
const crypto = require('crypto')
const http = require('http')
const socketIo = require('socket.io')
const sanitizeHtml = require('sanitize-html')
const cloudinary = require('cloudinary').v2

// Configure Cloudinary....
cloudinary.config({
    cloud_name: 'dwivlcbff',
    api_key: '412513514561222',
    api_secret: 'D6qyjK57GTS2nbiDw7djssokh7Q'
});

// Create HTTP server and Socket.io instance
const server = http.createServer(app)
const io = socketIo(server)

// Track online users with last active timestamp
const onlineUsers = new Map(); // username -> timestamp

// Function to check if a user is online
function isUserOnline(username) {
    return onlineUsers.has(username);
}

// Function to mark a user as online
function markUserOnline(username) {
    onlineUsers.set(username, Date.now());
    // Broadcast user online status to all clients
    io.emit('user status', { username, status: 'online' });
}

// Function to mark a user as offline
async function markUserOffline(username) {
    if (onlineUsers.has(username)) {
        // Update last seen time in database
        try {
            const lastSeenTime = Date.now();
            await collection.updateOne(
                { username },
                { $set: { lastSeen: new Date(lastSeenTime) } }
            );
        } catch (error) {
            console.error(`Failed to update lastSeen for ${username}:`, error);
        }
        
        onlineUsers.delete(username);
        // Broadcast user offline status to all clients
        io.emit('user status', { username, status: 'offline' });
    }
}

// Set up the cleanup job to run every 2 minutes
setInterval(() => {
    const now = Date.now();
    const timeoutThreshold = 5 * 60 * 1000; // 5 minutes inactive = offline

    // Check all online users
    for (const [username, lastActive] of onlineUsers.entries()) {
        // If user hasn't been active for more than the threshold, mark them offline
        if (now - lastActive > timeoutThreshold) {
            console.log(`User ${username} timed out - marking offline`);
            markUserOffline(username);
        }
    }
}, 2 * 60 * 1000); // Run every 2 minutes

// Configure sanitize-html options (stricter than default)
const sanitizeOptions = {
    allowedTags: [], // Don't allow any HTML tags
    allowedAttributes: {}, // Don't allow any HTML attributes
    disallowedTagsMode: 'escape', // Escape disallowed tags
    transformers: [
        // Custom transformer to preserve emoticons
        (tagName, attribs, children, options) => {
            // This is only called for allowed tags, but we're not allowing any tags
            // Just returning null means no transformation
            return null;
        }
    ]
}

// Sanitize function to prevent XSS
function sanitizeText(text) {
    if (!text) return '';
    
    // Preserve common emoticons before sanitizing
    const emoticonRegex = /(?:>\.<?|<\.>?|>\.<|<\w<|>\w>|>\.<|<\.<|>\.>|=\.=|\^\.\^|;\.|;\)|:\)|:\(|:D|:P|:O|:\/|:\\|:'\(|XD|x_x|o_O|O_o|0_0|-_-|\^_\^|\._\.|T_T)/g;
    
    // Replace emoticons with temporary placeholders
    const emoticonMap = new Map();
    let counter = 0;
    
    const markedText = text.replace(emoticonRegex, (match) => {
        const marker = `__EMOTICON_${counter}__`;
        emoticonMap.set(marker, match);
        counter++;
        return marker;
    });
    
    // Sanitize the text
    let sanitized = sanitizeHtml(markedText, sanitizeOptions);
    
    // Restore emoticons
    emoticonMap.forEach((emoticon, marker) => {
        sanitized = sanitized.replace(marker, emoticon);
    });
    
    return sanitized;
}

// Configure multer for memory storage (temporary storage before uploading to Cloudinary)
const storage = multer.memoryStorage()

// Add file filter to accept images and videos
const fileFilter = (req, file, cb) => {
    // Accept images and videos
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
        return cb(new Error('Only image and video files are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
})

const staticPath = path.join(__dirname, "../public")
const templatePath = path.join(__dirname, "../templates")

app.use(express.json())
app.use(express.static(staticPath))
app.use(express.static(templatePath))
app.use(express.urlencoded({extended:false}))

// Middleware to prevent caching of protected pages
const preventCaching = (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
};

// Middleware to handle pending registrations
const handlePendingRegistration = (req, res, next) => {
    // Skip check for authentication and registration pages
    const path = req.path.toLowerCase();
    if (path === '/login' || path === '/signup' || path === '/register' || 
        path === '/logout' || path === '/account-switch' || 
        path.startsWith('/css/') || path.startsWith('/js/') || 
        path.startsWith('/images/')) {
        return next();
    }
    
    // Check for pending registration flag in headers (sent from client)
    const pendingRegistration = req.headers['x-registration-pending'];
    if (pendingRegistration === 'true') {
        console.log('Redirecting user with pending registration to registration page');
        return res.redirect('/register');
    }
    
    next();
};

// Apply the middleware
app.use(handlePendingRegistration);

// Update routes to sendFile instead of render
app.get("/", preventCaching, (req, res) => {
    res.sendFile(path.join(templatePath, "index.html"))
})

// Add a route for /login that serves the login page
app.get("/login", (req, res) => {
    res.sendFile(path.join(templatePath, "login.html"))
})

app.get("/signup", (req, res) => {
    res.sendFile(path.join(templatePath, "signup.html"))
})

app.get("/profile", (req, res) => {
    res.sendFile(path.join(templatePath, "profile.html"))
})

// Add a route for /register that serves the register page
app.get("/register", (req, res) => {
    res.sendFile(path.join(templatePath, "register.html"))
})

// Add route for viewing other user profiles
app.get("/user/:username", (req, res) => {
    res.sendFile(path.join(templatePath, "user-profile.html"))
})

// Add endpoint to check username availability
app.post("/check-username", async(req, res) => {
    try {
        const username = req.body.username;
        if (!username) {
            return res.status(400).json({ error: "Username is required" });
        }

        // Validate username length
        if (username.length > 15) {
            return res.status(400).json({ error: "Username must be 15 characters or less" });
        }

        // Validate username characters
        const validUsernamePattern = /^[a-z0-9._]+$/;
        if (!validUsernamePattern.test(username)) {
            return res.status(400).json({ error: "Username can only contain lowercase letters, numbers, periods (.) and underscores (_)" });
        }

        // Check if username exists
        const existingUser = await collection.findOne({ username });
        res.json({ exists: !!existingUser });
    } catch (error) {
        console.error('Error checking username:', error);
        res.status(500).json({ error: "Error checking username availability" });
    }
});

// Add endpoint for changing password
app.post("/change-password", async(req, res) => {
    try {
        const { username, currentPassword, newPassword } = req.body;

        // Validate input
        if (!username || !currentPassword || !newPassword) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Validate new password length
        if (newPassword.length < 8) {
            return res.status(400).json({ error: "New password must be at least 8 characters long" });
        }

        // Find user
        const user = await collection.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Verify current password
        if (currentPassword !== user.password) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }

        // Update password
        await collection.updateOne(
            { username },
            { $set: { password: newPassword } }
        );

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: "Error changing password" });
    }
});

// Update signup endpoint to include validation
app.post("/signup", async(req, res) => {
    try {
        // Check if username and password exist in the request body
        if (!req.body || !req.body.username || !req.body.password) {
            return res.status(400).send("Username and password are required");
        }
        
        const data = {
            username: req.body.username,
            password: req.body.password,
            registrationStatus: 'pending', // Mark as pending until registration is complete
            createdAt: new Date(),
            profilePic: '/images/default-profile.png' // Set default profile picture
        }

        // Validate username length
        if (data.username.length > 15) {
            return res.status(400).send("Username must be 15 characters or less");
        }

        // Validate username characters
        const validUsernamePattern = /^[a-z0-9._]+$/;
        if (!validUsernamePattern.test(data.username)) {
            return res.status(400).send("Username can only contain lowercase letters, numbers, periods (.) and underscores (_)");
        }

        // Validate password length
        if (data.password.length < 8) {
            return res.status(400).send("Password must be at least 8 characters long");
        }

        // Check if username already exists
        const existingUser = await collection.findOne({ username: data.username });
        if (existingUser) {
            return res.status(400).send("Username is already taken");
        }

        // Create the user with pending status
        await collection.insertMany([data]);
        
        // Send HTML with script to set login status and redirect
        res.send(`
            <script>
                console.log("Signup successful, preparing to redirect...");
                
                // Set login status to true
                localStorage.setItem('isLoggedIn', 'true');
                
                // Store username
                localStorage.setItem('username', '${req.body.username}');
                
                // Set registration pending flag
                localStorage.setItem('registrationPending', 'true');
                
                // Define a function to handle the redirect
                function redirectToRegister() {
                    console.log("Redirecting to registration page...");
                    window.location.href = '/register';
                }
                
                // Try immediate redirect
                redirectToRegister();
                
                // Fallback with shorter timeout
                setTimeout(function() {
                    console.log("Fallback redirect triggered");
                    window.location.replace('/register');
                }, 500);
                
                // Second fallback with force reload
                setTimeout(function() {
                    console.log("Force reload fallback triggered");
                    window.location.href = '/register?forcereload=' + new Date().getTime();
                }, 1500);
            </script>
        `);
    } catch (error) {
        res.status(500).send("Error during signup: " + error.message)
    }
});

// Update login endpoint to include login script and store username
app.post("/login", async(req, res) => {
    try {
        // First check if username exists
        const user = await collection.findOne({ username: req.body.username });
        
        if (!user) {
            return res.status(401).json({ 
                error: "Invalid Username",
                message: "Username does not exist"
            });
        }
        
        // Check if registration is complete
        if (user.registrationStatus === 'pending') {
            return res.status(401).json({
                error: "Registration Incomplete",
                message: "Please complete your registration process first",
                pendingRegistration: true
            });
        }

        // Then check if password matches
        if (user.password !== req.body.password) {
            return res.status(401).json({ 
                error: "Invalid Password",
                message: "Incorrect password"
            });
        }

        // If both checks pass, send success response with redirect script
        res.json({
            success: true,
            script: `
                // Set login status to true
                localStorage.setItem('isLoggedIn', 'true');
                // Store username
                localStorage.setItem('username', '${user.username}');
                // Set flag that user just logged in (for showing modal)
                sessionStorage.setItem('justLoggedIn', 'true');
                // Redirect to root URL (dashboard)
                window.location.href = '/';
            `
        });
    } catch (error) {
        res.status(500).json({ 
            error: "Login Error",
            message: "An error occurred during login. Please try again."
        });
    }
});

// Add a route for the home page
app.get("/home", preventCaching, (req, res) => {
    res.sendFile(path.join(templatePath, "index.html"));
});

// Update logout route to clear login status and all session data
app.get("/logout", (req, res) => {
    res.send(`
        <script>
            // Get current username for account switching
            const username = localStorage.getItem('username');
            
            // Clear login status but keep account info in localStorage
            localStorage.removeItem('isLoggedIn');
            
            // Handle account switching
            if (username) {
                // Get active accounts
                const activeAccountsJSON = localStorage.getItem('activeAccounts');
                let activeAccounts = activeAccountsJSON ? JSON.parse(activeAccountsJSON) : [];
                
                // Find user in active accounts
                const accountIndex = activeAccounts.findIndex(account => account.username === username);
                
                if (accountIndex >= 0) {
                    // Remove current account from active accounts
                    activeAccounts.splice(accountIndex, 1);
                    localStorage.setItem('activeAccounts', JSON.stringify(activeAccounts));
                    
                    // Note: We no longer add logged out accounts to the recent accounts list
                    // This prevents duplicate entries between active and recent accounts
                }
            }
            
            // Clear session storage
            sessionStorage.removeItem('justLoggedIn');
            sessionStorage.clear();
            
            // Redirect to account switch page
            window.location.href = '/account-switch';
        </script>
    `);
});

// Add route for account switching page
app.get("/account-switch", preventCaching, (req, res) => {
    res.sendFile(path.join(templatePath, "account-switch.html"));
});

// Update endpoint to get user profile data
app.get("/api/user/profile", async(req, res) => {
    try {
        // Get username from localStorage (sent in request headers)
        const username = req.headers['x-username'];
        if (!username) {
            return res.status(401).json({ error: "User not authenticated" });
        }

        const user = await collection.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Format gender with first letter capitalized
        const formattedGender = user.gender 
            ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) 
            : 'Not specified';
        
        // Get friend count
        const friendCount = await Friend.countDocuments({ user: username });
        
        // Return all profile data
        res.json({
            username: user.username,
            displayName: user.displayName || user.username,
            profilePic: user.profilePic || '/images/default-profile.png',
            gender: formattedGender,
            dob: user.dateOfBirth ? user.dateOfBirth : 'Not specified',
            friendCount: friendCount
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: "Error fetching profile data" });
    }
});

// Update the profile picture upload endpoint
app.post("/upload-profile-pic", upload.single('profilePic'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const username = req.body.username;
        if (!username) {
            return res.status(400).json({ error: "Username is required" });
        }

        // Get the user's current profile picture URL
        const user = await collection.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // If user has an existing profile picture on Cloudinary, delete it
        if (user.profilePic && user.profilePic.includes('cloudinary.com')) {
            try {
                // Extract public_id from the Cloudinary URL
                const urlParts = user.profilePic.split('/');
                const publicId = urlParts[urlParts.length - 1].split('.')[0];
                
                // Delete the old image from Cloudinary
                await cloudinary.uploader.destroy(`profile_pics/${publicId}`);
                console.log('Deleted old profile picture:', publicId);
            } catch (deleteError) {
                console.error('Error deleting old profile picture:', deleteError);
                // Continue with upload even if deletion fails
            }
        }

        // Convert buffer to base64
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        // Upload to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(dataURI, {
            folder: 'profile_pics',
            resource_type: 'auto'
        });

        // Update user's profile picture in database
        await collection.updateOne(
            { username },
            { $set: { profilePic: uploadResponse.secure_url } }
        );

        res.json({ 
            success: true, 
            profilePic: uploadResponse.secure_url 
        });
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        res.status(500).json({ error: "Error uploading profile picture" });
    }
});

// Add route to handle registration form submission
app.post("/register", upload.single('profilePic'), async(req, res) => {
    try {
        const username = req.body.username;
        
        // Check if user exists and has pending status
        const user = await collection.findOne({ username });
        
        if (!user) {
            return res.status(404).send(`
                <script>
                    notifications.error('Registration Failed', 'User account not found. Please sign up again.');
                    setTimeout(function() {
                        window.location.href = '/signup';
                    }, 3000);
                </script>
            `);
        }
        
        const data = {
            displayName: req.body.displayName,
            gender: req.body.gender,
            dateOfBirth: req.body.dateOfBirth,
            registrationStatus: 'active' // Update status to active
        };

        // Handle profile picture upload
        if (req.file) {
            try {
                // Convert buffer to base64
                const b64 = Buffer.from(req.file.buffer).toString("base64");
                const dataURI = `data:${req.file.mimetype};base64,${b64}`;

                // Upload to Cloudinary
                const uploadResponse = await cloudinary.uploader.upload(dataURI, {
                    folder: 'profile_pics',
                    resource_type: 'auto'
                });

                data.profilePic = uploadResponse.secure_url;
            } catch (uploadError) {
                console.error('Error uploading profile picture:', uploadError);
                // If upload fails, use default profile picture
                data.profilePic = '/images/default-profile.png';
            }
        } else {
            // If no profile picture uploaded, use default
            data.profilePic = '/images/default-profile.png';
        }

        // Update user profile in database
        await collection.updateOne(
            { username },
            { $set: data }
        );

        // Send success response with redirect script
        res.send(`
            <script>
                // Remove registration pending flag
                localStorage.removeItem('registrationPending');
                
                // Redirect to home page
                window.location.href = '/';
            </script>
        `);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).send(`
            <script>
                notifications.error('Registration Failed', 'An error occurred during registration. Please try again.');
            </script>
        `);
    }
});

// Add endpoint to get chat history
app.get("/api/chat/history", async(req, res) => {
    try {
        // Get the last 50 messages
        const messages = await Message.find()
            .sort({ timestamp: -1 })
            .limit(50)
            .exec();
        
        // Return the messages in reverse order (oldest first)
        res.json(messages.reverse());
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ error: "Error fetching chat history" });
    }
});

// Add endpoint to get specific user profile data
app.get("/api/user/:username/profile", async(req, res) => {
    try {
        // Get current username and target username
        const currentUsername = req.headers['x-username'];
        const targetUsername = req.params.username;
        
        if (!currentUsername) {
            return res.status(401).json({ error: "You must be logged in to view profiles" });
        }

        const user = await collection.findOne({ username: targetUsername });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Format gender with first letter capitalized
        const formattedGender = user.gender 
            ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) 
            : 'Not specified';

        // Get friend count
        const friendCount = await Friend.countDocuments({ user: targetUsername });

        // Check friendship status
        let friendshipStatus = 'not_friends';
        
        // Check if they are friends
        const areFriends = await Friend.findOne({
            $or: [
                { user: currentUsername, friend: targetUsername },
                { user: targetUsername, friend: currentUsername }
            ]
        });
        
        if (areFriends) {
            friendshipStatus = 'friends';
        } else {
            // Check for pending requests
            const sentRequest = await FriendRequest.findOne({
                sender: currentUsername,
                recipient: targetUsername,
                status: 'pending'
            });
            
            if (sentRequest) {
                friendshipStatus = 'pending_sent';
            } else {
                const receivedRequest = await FriendRequest.findOne({
                    sender: targetUsername,
                    recipient: currentUsername,
                    status: 'pending'
                });
                
                if (receivedRequest) {
                    friendshipStatus = 'pending_received';
                }
            }
        }
            
        // Return user profile data with friendship status
        res.json({
            username: user.username,
            displayName: user.displayName || user.username,
            profilePic: user.profilePic || '/images/default-profile.png',
            gender: formattedGender,
            dob: user.dateOfBirth ? user.dateOfBirth : 'Not specified',
            isCurrentUser: currentUsername === targetUsername,
            friendshipStatus: friendshipStatus,
            friendCount: friendCount
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: "Error fetching profile data" });
    }
});

// Add endpoint to search for users
app.get("/api/search/users", async(req, res) => {
    try {
        const query = req.query.q;
        console.log('User search query:', query);
        
        if (!query || query.trim().length === 0) {
            console.log('Empty search query, returning empty results');
            return res.json({ users: [], message: "Please enter a search term" });
        }
        
        // Get current username from headers
        const currentUsername = req.headers['x-username'];
        if (!currentUsername) {
            console.warn('User search attempted without authentication');
            return res.status(401).json({ 
                error: "User not authenticated", 
                message: "You must be logged in to search for users" 
            });
        }
        
        console.log(`User ${currentUsername} searching for: "${query}"`);
        
        // Search for users matching the query in username or displayName
        // Use case-insensitive regex search
        const users = await collection.find({
            $or: [
                { username: { $regex: query, $options: "i" } },
                { displayName: { $regex: query, $options: "i" } }
            ]
        }).limit(10).exec();
        
        console.log(`Found ${users.length} users matching query '${query}'`);
        
        // Format the results
        const formattedUsers = users.map(user => ({
            username: user.username,
            displayName: user.displayName || user.username,
            profilePic: user.profilePic || '/images/default-profile.png',
            isCurrentUser: user.username === currentUsername
        }));
        
        // Send appropriate response based on results
        if (formattedUsers.length === 0) {
            return res.json({ 
                users: [], 
                message: `No users found matching "${query}"` 
            });
        }
        
        res.json({ 
            users: formattedUsers,
            message: `Found ${formattedUsers.length} user(s)` 
        });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ 
            error: "Error searching users",
            message: "An error occurred while searching for users. Please try again."
        });
    }
});

// Socket.io connection handling
io.use(async (socket, next) => {
    const username = socket.handshake.auth.username;
    if (!username) {
        return next(new Error("Invalid username"));
    }
    
    // Fetch user's display name from database
    try {
        const user = await collection.findOne({ username });
        if (user) {
            socket.username = username;
            socket.displayName = user.displayName || username; // Use display name or fall back to username
        } else {
            socket.username = username;
            socket.displayName = username;
        }
        next();
    } catch (error) {
        console.error('Error fetching user:', error);
        return next(new Error("Error authenticating user"));
    }
});

// Handle socket connections
io.on('connection', async (socket) => {
    const username = socket.username;
    const displayName = socket.displayName;
    console.log(`User connected: ${displayName} (${username})`);
    
    // Mark the user as online
    markUserOnline(username);
    
    // Get user's profile picture
    let profilePic = '/images/default-profile.png';
    try {
        const currentUser = await collection.findOne({ username });
        if (currentUser && currentUser.profilePic) {
            profilePic = currentUser.profilePic;
        }
        socket.profilePic = profilePic;
    } catch (error) {
        console.error('Error fetching profile picture:', error);
    }
    
    // Send the current online users to the newly connected user
    const onlineUsersList = Array.from(onlineUsers.keys());
    socket.emit('online users', onlineUsersList);
    
    // Send chat history to the newly connected user
    try {
        const messages = await Message.find()
            .sort({ timestamp: 1 }) // Sort by timestamp ascending (oldest first)
            .exec();
        
        // Create maps for user data
        const userDisplayNames = new Map();
        const userProfilePics = new Map();
        
        // Add current user to maps
        userDisplayNames.set(username, displayName);
        userProfilePics.set(username, profilePic);
        
        // Get unique usernames from messages
        const uniqueUsernames = [...new Set(messages
            .filter(msg => msg.type === 'user')
            .map(msg => msg.username))];
            
        // Fetch user data for all users in messages
        if (uniqueUsernames.length > 0) {
            const users = await collection.find({ 
                username: { $in: uniqueUsernames } 
            }).exec();
            
            users.forEach(user => {
                userDisplayNames.set(user.username, user.displayName || user.username);
                userProfilePics.set(user.username, user.profilePic || '/images/default-profile.png');
            });
        }
        
        // Emit messages one by one
        messages.forEach(msg => {
            if (msg.type === 'system') {
                socket.emit('system message', {
                    text: msg.text,
                    timestamp: msg.timestamp
                });
            } else {
                socket.emit('chat message', {
                    _id: msg._id, // Include the message ID
                    username: msg.username,
                    displayName: userDisplayNames.get(msg.username) || msg.username,
                    profilePic: userProfilePics.get(msg.username) || '/images/default-profile.png',
                    text: msg.text,
                    timestamp: msg.timestamp,
                    media: msg.media || null,
                    reactions: msg.reactions || [],
                    replyTo: msg.replyTo || null
                });
            }
        });
        
        // Let the client know all history messages have been sent
        socket.emit('history complete');
    } catch (error) {
        console.error('Error sending chat history:', error);
    }
    
    // Socket rooms for private messaging
    socket.join(username); // Join a personal room for receiving private messages
    
    // Handle chat messages
    socket.on('chat message', async (msg) => {
        try {
            // Create message object without media
            const messageData = {
                username: socket.username,
                text: msg.text || '',
                timestamp: new Date(),
                type: 'user'
            };

            // Add media if present
            if (msg.media) {
                messageData.media = {
                    url: msg.media.url,
                    type: msg.media.type,
                    name: msg.media.name
                };
            }
            
            // Add reply data if this is a reply
            if (msg.replyTo) {
                messageData.replyTo = {
                    messageId: msg.replyTo.messageId,
                    text: msg.replyTo.text,
                    username: msg.replyTo.username,
                    timestamp: msg.replyTo.timestamp
                };
            }

            // Save to database
            const message = new Message(messageData);
            await message.save();

            // Add user info to the message data for broadcasting
            const broadcastData = {
                ...messageData,
                _id: message._id, // Include the message ID
                displayName: socket.displayName,
                profilePic: socket.profilePic
            };

            // Log for debugging
            console.log(`Broadcasting message with ID: ${message._id}`);

            // Broadcast to all clients
            io.emit('chat message', broadcastData);
        } catch (error) {
            console.error('Error saving message:', error);
            socket.emit('error', 'Failed to send message');
        }
    });
    
    // Handle private messages
    socket.on('private message', async (data) => {
        const { recipient, text, media, replyTo } = data;
        
        // Allow empty text if media is present
        if (!recipient || (!text && !media)) {
            console.log('Invalid private message data:', data);
            return socket.emit('error', { message: 'Invalid message data' });
        }
        
        // Sanitize message text (if present)
        const sanitizedText = text ? sanitizeText(text) : '';
        
        try {
            console.log(`Private message from ${socket.username} to ${recipient}: "${sanitizedText.substring(0, 30)}${sanitizedText.length > 30 ? '...' : ''}"${media ? ' [with media]' : ''}${replyTo ? ' [reply]' : ''}`);
            
            // Get recipient user
            const recipientUser = await collection.findOne({ username: recipient });
            if (!recipientUser) {
                console.warn(`Recipient not found: ${recipient}`);
                return socket.emit('error', { message: 'Recipient user not found' });
            }
            
            // Create the message data
            const messageData = {
                sender: socket.username,
                senderDisplayName: socket.displayName,
                senderProfilePic: socket.profilePic,
                recipient: recipient,
                recipientDisplayName: recipientUser.displayName || recipient,
                recipientProfilePic: recipientUser.profilePic || '/images/default-profile.png',
                text: sanitizedText,
                timestamp: new Date(),
                media: media || null
            };
            
            // Add reply data if this is a reply
            if (replyTo) {
                messageData.replyTo = {
                    messageId: replyTo.messageId,
                    text: replyTo.text,
                    username: replyTo.username,
                    timestamp: replyTo.timestamp
                };
            }
            
            // Save to database
            const newDirectMessage = new DirectMessage({
                sender: messageData.sender,
                recipient: messageData.recipient,
                text: messageData.text,
                timestamp: messageData.timestamp,
                read: false,
                media: messageData.media,
                replyTo: messageData.replyTo
            });
            
            await newDirectMessage.save();
            console.log(`Saved direct message with ID: ${newDirectMessage._id}`);
            
            // Update or create conversation
            const participantsArray = [socket.username, recipient].sort();
            let conversation = await Conversation.findOne({
                participants: { $all: participantsArray, $size: 2 }
            });
            
            if (conversation) {
                // Update existing conversation
                console.log(`Updating existing conversation: ${conversation._id}`);
                conversation.lastMessage = media ? '[Media] ' + sanitizedText : sanitizedText;
                conversation.lastMessageTime = messageData.timestamp;
                conversation.updatedAt = messageData.timestamp;
                await conversation.save();
            } else {
                // Create new conversation
                console.log(`Creating new conversation for users: ${participantsArray.join(', ')}`);
                conversation = new Conversation({
                    participants: participantsArray,
                    lastMessage: media ? '[Media] ' + sanitizedText : sanitizedText,
                    lastMessageTime: messageData.timestamp,
                    updatedAt: messageData.timestamp
                });
                await conversation.save();
                console.log(`Created new conversation with ID: ${conversation._id}`);
            }
            
            // Add message ID to the message data for the client
            messageData.id = newDirectMessage._id;
            
            // Log for debugging
            console.log(`Private message created with ID: ${newDirectMessage._id}`);
            
            // Emit to sender
            console.log(`Emitting private message to sender: ${socket.username}`);
            socket.emit('private message', {
                ...messageData,
                isSelf: true
            });
            
            // Emit to recipient if online
            console.log(`Emitting private message to recipient: ${recipient}`);
            socket.to(recipient).emit('private message', {
                ...messageData,
                isSelf: false
            });
            
            // Also emit conversation update
            const conversationData = {
                id: conversation._id,
                participants: conversation.participants,
                lastMessage: conversation.lastMessage,
                lastMessageTime: conversation.lastMessageTime,
                updatedAt: conversation.updatedAt
            };
            
            console.log('Emitting conversation update to both users');
            socket.emit('conversation update', conversationData);
            socket.to(recipient).emit('conversation update', conversationData);
            
        } catch (error) {
            console.error('Error sending private message:', error);
            socket.emit('error', { message: 'Error sending message: ' + error.message });
        }
    });
    
    // Handle marking messages as read
    socket.on('mark messages read', async (data) => {
        const { conversationWith } = data;
        
        if (!conversationWith) {
            console.warn('Invalid mark messages read data:', data);
            return;
        }
        
        try {
            console.log(`Marking messages from ${conversationWith} to ${socket.username} as read`);
            
            const updateResult = await DirectMessage.updateMany(
                { sender: conversationWith, recipient: socket.username, read: false },
                { $set: { read: true } }
            );
            
            console.log(`Marked ${updateResult.modifiedCount} messages as read`);
            
            // Notify the other user that their messages were read
            if (updateResult.modifiedCount > 0) {
                console.log(`Notifying ${conversationWith} that messages were read by ${socket.username}`);
                socket.to(conversationWith).emit('messages read', { 
                    by: socket.username,
                    count: updateResult.modifiedCount
                });
            }
        } catch (error) {
            console.error('Error marking messages as read:', error);
            socket.emit('error', { message: 'Error marking messages as read' });
        }
    });
    
    // Handle user heartbeat to keep active status
    socket.on('heartbeat', () => {
        onlineUsers.set(username, Date.now());
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
        console.log(`User disconnected: ${displayName} (${username})`);
        
        // Wait a short period before marking user as offline
        // This helps with connection flaps and page refreshes
        setTimeout(() => {
            // Check if user has reconnected before marking offline
            const userSockets = io.sockets.adapter.rooms.get(username);
            if (!userSockets || userSockets.size === 0) {
                markUserOffline(username);
            }
        }, 5000); // 5 seconds delay
    });

    // Handle message reactions (for server chat)
    socket.on('message reaction', async (data) => {
        try {
            const { messageId, emoji } = data;
            
            // Check for missing or invalid data
            if (!messageId || !emoji) {
                console.error('Invalid reaction data:', data);
                return socket.emit('error', { message: 'Invalid reaction data. Missing messageId or emoji.' });
            }
            
            // Check if messageId is valid for MongoDB ObjectId
            if (typeof messageId !== 'string' || !messageId.match(/^[0-9a-fA-F]{24}$/)) {
                console.error('Invalid messageId format:', messageId);
                return socket.emit('error', { message: 'Invalid message ID format' });
            }
            
            console.log(`Reaction from ${socket.username} on message ${messageId}: ${emoji}`);
            
            // Find the message
            const message = await Message.findById(messageId);
            if (!message) {
                console.error('Message not found with ID:', messageId);
                return socket.emit('error', { message: 'Message not found' });
            }
            
            // Initialize reactions array if not exists
            if (!message.reactions) message.reactions = [];
            
            // Check if user already reacted with this emoji
            const existingReactionIndex = message.reactions.findIndex(
                r => r.username === socket.username && r.emoji === emoji
            );
            
            if (existingReactionIndex >= 0) {
                // Remove existing reaction (toggle off)
                message.reactions.splice(existingReactionIndex, 1);
                console.log(`Removed reaction ${emoji} from ${socket.username} on message ${messageId}`);
            } else {
                // Add new reaction
                message.reactions.push({
                    emoji,
                    username: socket.username,
                    timestamp: new Date()
                });
                console.log(`Added reaction ${emoji} from ${socket.username} on message ${messageId}`);
            }
            
            // Save updated message
            await message.save();
            
            // Broadcast reaction update to all clients
            io.emit('message reaction update', {
                messageId: message._id,
                reactions: message.reactions,
                reactingUser: socket.username
            });
            
        } catch (error) {
            console.error('Error processing message reaction:', error);
            socket.emit('error', { message: 'Error processing reaction' });
        }
    });
    
    // Handle direct message reactions
    socket.on('private message reaction', async (data) => {
        try {
            const { messageId, emoji, conversationWith } = data;
            
            // Check for missing or invalid data
            if (!messageId || !emoji || !conversationWith) {
                console.error('Invalid private reaction data:', data);
                return socket.emit('error', { message: 'Invalid reaction data. Missing messageId, emoji, or conversationWith.' });
            }
            
            // Check if messageId is valid for MongoDB ObjectId
            if (typeof messageId !== 'string' || !messageId.match(/^[0-9a-fA-F]{24}$/)) {
                console.error('Invalid messageId format for private message:', messageId);
                return socket.emit('error', { message: 'Invalid message ID format' });
            }
            
            console.log(`Private reaction from ${socket.username} on message ${messageId}: ${emoji}`);
            
            // Find the message
            const message = await DirectMessage.findById(messageId);
            if (!message) {
                console.error('DirectMessage not found with ID:', messageId);
                return socket.emit('error', { message: 'Message not found' });
            }
            
            // Verify the user is part of this conversation
            if (message.sender !== socket.username && message.recipient !== socket.username) {
                return socket.emit('error', { message: 'Not authorized to react to this message' });
            }
            
            // Initialize reactions array if not exists
            if (!message.reactions) message.reactions = [];
            
            // Check if user already reacted with this emoji
            const existingReactionIndex = message.reactions.findIndex(
                r => r.username === socket.username && r.emoji === emoji
            );
            
            if (existingReactionIndex >= 0) {
                // Remove existing reaction (toggle off)
                message.reactions.splice(existingReactionIndex, 1);
                console.log(`Removed private reaction ${emoji} from ${socket.username} on message ${messageId}`);
            } else {
                // Add new reaction
                message.reactions.push({
                    emoji,
                    username: socket.username,
                    timestamp: new Date()
                });
                console.log(`Added private reaction ${emoji} from ${socket.username} on message ${messageId}`);
            }
            
            // Save updated message
            await message.save();
            
            // Create reaction update data
            const reactionData = {
                messageId: message._id,
                reactions: message.reactions,
                reactingUser: socket.username
            };
            
            // Emit to sender and recipient
            socket.emit('private message reaction update', reactionData);
            
            // Determine the other participant in the conversation
            const otherParticipant = message.sender === socket.username ? message.recipient : message.sender;
            socket.to(otherParticipant).emit('private message reaction update', reactionData);
            
        } catch (error) {
            console.error('Error processing private message reaction:', error);
            socket.emit('error', { message: 'Error processing reaction' });
        }
    });
});

// Add routes for direct messaging
app.get('/messages/:username', (req, res) => {
    res.sendFile(path.join(templatePath, 'private-messages.html'));
});

// Add route for the main messages page
app.get('/messages', (req, res) => {
    res.sendFile(path.join(templatePath, 'private-messages.html'));
});

// Add endpoint to get conversation list
app.get('/api/conversations', async (req, res) => {
    const username = req.headers['x-username'];
    
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }
    
    try {
        // Find conversations for the user
        const conversations = await Conversation.find({
            participants: username
        }).sort({ lastActivity: -1 }); // Sort by most recent activity
        
        // Format conversations for response
        const formattedConversations = await Promise.all(conversations.map(async (conv) => {
            // Find the other user in the conversation
            const otherUser = conv.participants.find(p => p !== username);
            
            // Get user details
            const userDetails = await collection.findOne({ username: otherUser });
            
            if (!userDetails) {
                return null; // Skip if user not found
            }
            
            // Count unread messages
            const unreadCount = await DirectMessage.countDocuments({
                sender: otherUser,
                recipient: username,
                read: false
            });
            
            // Check if user is online
            const isOnline = isUserOnline(otherUser);
            
            return {
                withUser: otherUser,
                withUserDisplayName: userDetails.displayName || otherUser,
                withUserProfilePic: userDetails.profilePic || '/images/default-profile.png',
                lastMessage: conv.lastMessage,
                lastMessageTime: conv.lastActivity,
                unreadCount: unreadCount,
                isOnline: isOnline
            };
        }));
        
        // Filter out null values (conversations with deleted users)
        const filteredConversations = formattedConversations.filter(conv => conv !== null);
        
        res.json({ conversations: filteredConversations });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to load conversations' });
    }
});

// API to get messages between two users
app.get('/api/messages/:otherUsername', async (req, res) => {
    const username = req.headers['x-username'];
    const otherUsername = req.params.otherUsername;
    
    if (!username || !otherUsername) {
        return res.status(400).json({ error: 'Both usernames are required' });
    }
    
    try {
        // Get otherUser details
        const otherUser = await collection.findOne({ username: otherUsername });
        if (!otherUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if user is online
        const isOnline = isUserOnline(otherUsername);
        
        // Find messages between the two users
        const messages = await DirectMessage.find({
            $or: [
                { sender: username, recipient: otherUsername },
                { sender: otherUsername, recipient: username }
            ]
        }).sort({ timestamp: 1 }); // Sort by timestamp (oldest first)
        
        // Format messages for the client
        const formattedMessages = messages.map(msg => {
            const isSelf = msg.sender === username;
            return {
                id: msg._id,
                sender: msg.sender,
                text: msg.text,
                timestamp: msg.timestamp,
                media: msg.media || null,
                isSelf: isSelf,
                read: msg.read,
                senderDisplayName: isSelf ? null : (otherUser.displayName || otherUsername),
                senderProfilePic: isSelf ? null : (otherUser.profilePic || '/images/default-profile.png'),
                replyTo: msg.replyTo || null,
                reactions: msg.reactions || [] // Include reactions array
            };
        });
        
        res.json({
            messages: formattedMessages,
            user: {
                username: otherUsername,
                displayName: otherUser.displayName || otherUsername,
                profilePic: otherUser.profilePic || '/images/default-profile.png',
                isOnline: isOnline,
                lastSeen: isOnline ? null : otherUser.lastSeen
            }
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Error fetching messages' });
    }
});

// Add a route to start a conversation from user profile
app.get('/messages/new/:username', async (req, res) => {
    try {
        const targetUsername = req.params.username;
        const currentUsername = req.headers['x-username'] || req.query.from;
        
        if (!currentUsername) {
            // If not authenticated, redirect to login page
            return res.redirect('/login');
        }
        
        // Check if the target user exists
        const targetUser = await collection.findOne({ username: targetUsername });
        if (!targetUser) {
            return res.status(404).send('User not found');
        }
        
        // Check if current user exists
        const currentUser = await collection.findOne({ username: currentUsername });
        if (!currentUser) {
            return res.status(401).send('Invalid user');
        }
        
        console.log(`Starting conversation between ${currentUsername} and ${targetUsername}`);
        
        // Redirect to the messages page with the target user
        res.redirect(`/messages/${targetUsername}`);
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).send('An error occurred');
    }
});

// Add endpoint to get friendship status between two users
app.get('/api/friends/status/:username', async (req, res) => {
    try {
        const currentUsername = req.headers['x-username'];
        const targetUsername = req.params.username;
        
        if (!currentUsername) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        // Check if they are already friends
        const areFriends = await Friend.findOne({
            $or: [
                { user: currentUsername, friend: targetUsername },
                { user: targetUsername, friend: currentUsername }
            ]
        });
        
        if (areFriends) {
            return res.json({ status: 'friends' });
        }
        
        // Check if there's a pending request from current user to target
        const sentRequest = await FriendRequest.findOne({
            sender: currentUsername,
            recipient: targetUsername,
            status: 'pending'
        });
        
        if (sentRequest) {
            return res.json({ status: 'pending_sent' });
        }
        
        // Check if there's a pending request from target to current user
        const receivedRequest = await FriendRequest.findOne({
            sender: targetUsername,
            recipient: currentUsername,
            status: 'pending'
        });
        
        if (receivedRequest) {
            return res.json({ status: 'pending_received' });
        }
        
        // No relationship found
        return res.json({ status: 'not_friends' });
    } catch (error) {
        console.error('Error checking friendship status:', error);
        res.status(500).json({ error: 'Error checking friendship status' });
    }
});

// Add endpoint to perform friend actions (add, accept, remove)
app.post('/api/friends/action/:username', async (req, res) => {
    try {
        const currentUsername = req.headers['x-username'];
        const targetUsername = req.params.username;
        
        if (!currentUsername) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        // Check if target user exists
        const targetUser = await collection.findOne({ username: targetUsername });
        if (!targetUser) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Get current friendship status
        const areFriends = await Friend.findOne({
            $or: [
                { user: currentUsername, friend: targetUsername },
                { user: targetUsername, friend: currentUsername }
            ]
        });
        
        const sentRequest = await FriendRequest.findOne({
            sender: currentUsername,
            recipient: targetUsername,
            status: 'pending'
        });
        
        const receivedRequest = await FriendRequest.findOne({
            sender: targetUsername,
            recipient: currentUsername,
            status: 'pending'
        });
        
        // Handle action based on current status
        if (areFriends) {
            // If they're already friends, remove friendship
            await Friend.deleteMany({
                $or: [
                    { user: currentUsername, friend: targetUsername },
                    { user: targetUsername, friend: currentUsername }
                ]
            });
            
            return res.json({
                success: true,
                title: 'Friend Removed',
                message: `You are no longer friends with ${targetUser.displayName || targetUsername}`
            });
        } else if (sentRequest) {
            // If there's a pending request from current user, cancel it
            await FriendRequest.deleteOne({ _id: sentRequest._id });
            
            return res.json({
                success: true,
                title: 'Request Cancelled',
                message: `Friend request to ${targetUser.displayName || targetUsername} cancelled`
            });
        } else if (receivedRequest) {
            // If there's a pending request from target user, accept it
            await FriendRequest.updateOne(
                { _id: receivedRequest._id },
                { $set: { status: 'accepted', updatedAt: new Date() } }
            );
            
            // Create friend relationship (bidirectional)
            await Friend.create([
                { user: currentUsername, friend: targetUsername },
                { user: targetUsername, friend: currentUsername }
            ]);
            
            return res.json({
                success: true,
                title: 'Friend Added',
                message: `You are now friends with ${targetUser.displayName || targetUsername}`
            });
        } else {
            // No existing relationship, create new friend request
            await FriendRequest.create({
                sender: currentUsername,
                recipient: targetUsername,
                status: 'pending'
            });
            
            return res.json({
                success: true,
                title: 'Request Sent',
                message: `Friend request sent to ${targetUser.displayName || targetUsername}`
            });
        }
    } catch (error) {
        console.error('Error performing friend action:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error processing friend action' 
        });
    }
});

// Add endpoint to get friends list
app.get('/api/friends', async (req, res) => {
    try {
        const username = req.headers['x-username'];
        
        if (!username) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Support for pagination
        const limit = req.query.limit ? parseInt(req.query.limit) : 100;
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const skip = (page - 1) * limit;
        
        // Find friends with pagination
        const friendships = await Friend.find({ user: username }).skip(skip).limit(limit);
        const totalCount = await Friend.countDocuments({ user: username });
        
        if (friendships.length === 0) {
            return res.json({ 
                friends: [],
                pagination: {
                    total: 0,
                    page: page,
                    limit: limit,
                    pages: 0
                }
            });
        }
        
        // Get friend usernames
        const friendUsernames = friendships.map(f => f.friend);
        
        // Get profile details for each friend
        const friendProfiles = await collection.find({ 
            username: { $in: friendUsernames } 
        });
        
        // Format friend data with online status
        const friends = friendProfiles.map(profile => {
            const isOnline = isUserOnline(profile.username);
            return {
                username: profile.username,
                displayName: profile.displayName || profile.username,
                profilePic: profile.profilePic || '/images/default-profile.png',
                isOnline: isOnline,
                lastSeen: isOnline ? null : profile.lastSeen
            };
        });
        
        // Sort friends: online first, then by username
        friends.sort((a, b) => {
            // First sort by online status
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            
            // Then sort by username/displayName alphabetically
            return a.displayName.localeCompare(b.displayName);
        });
        
        res.json({ 
            friends,
            pagination: {
                total: totalCount,
                page: page,
                limit: limit,
                pages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Error getting friends list:', error);
        res.status(500).json({ error: 'Error getting friends list' });
    }
});

// Add endpoint to get friend requests
app.get('/api/friends/requests', async (req, res) => {
    try {
        const username = req.headers['x-username'];
        
        if (!username) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        // Find received pending requests
        const receivedRequests = await FriendRequest.find({ 
            recipient: username,
            status: 'pending'
        });
        
        if (receivedRequests.length === 0) {
            return res.json({ requests: [] });
        }
        
        // Get sender usernames
        const senderUsernames = receivedRequests.map(req => req.sender);
        
        // Get profile details for each sender
        const senderProfiles = await collection.find({ 
            username: { $in: senderUsernames } 
        });
        
        // Create a map of username to profile data for faster lookup
        const profileMap = new Map();
        senderProfiles.forEach(profile => {
            profileMap.set(profile.username, profile);
        });
        
        // Format request data
        const requests = receivedRequests.map(request => {
            const profile = profileMap.get(request.sender);
            return {
                requestId: request._id,
                username: request.sender,
                displayName: profile ? (profile.displayName || request.sender) : request.sender,
                profilePic: profile ? (profile.profilePic || '/images/default-profile.png') : '/images/default-profile.png',
                createdAt: request.createdAt
            };
        });
        
        res.json({ requests });
    } catch (error) {
        console.error('Error getting friend requests:', error);
        res.status(500).json({ error: 'Error getting friend requests' });
    }
});

// Add endpoint to handle friend request response (accept/reject)
app.post('/api/friends/requests/:requestId', async (req, res) => {
    try {
        const username = req.headers['x-username'];
        const requestId = req.params.requestId;
        const { action } = req.body;
        
        if (!username) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        if (!action || !['accept', 'reject'].includes(action)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid action specified' 
            });
        }
        
        // Find the request
        const request = await FriendRequest.findById(requestId);
        
        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: 'Friend request not found' 
            });
        }
        
        // Verify the current user is the recipient
        if (request.recipient !== username) {
            return res.status(403).json({ 
                success: false, 
                message: 'You are not authorized to respond to this request' 
            });
        }
        
        if (request.status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                message: 'This request has already been processed' 
            });
        }
        
        // Get sender profile for the response message
        const senderProfile = await collection.findOne({ username: request.sender });
        const senderName = senderProfile ? (senderProfile.displayName || request.sender) : request.sender;
        
        if (action === 'accept') {
            // Update request status
            await FriendRequest.updateOne(
                { _id: requestId },
                { $set: { status: 'accepted', updatedAt: new Date() } }
            );
            
            // Create bidirectional friendship
            await Friend.create([
                { user: username, friend: request.sender },
                { user: request.sender, friend: username }
            ]);
            
            return res.json({
                success: true,
                message: `You are now friends with ${senderName}`
            });
        } else {
            // Reject the request
            await FriendRequest.updateOne(
                { _id: requestId },
                { $set: { status: 'rejected', updatedAt: new Date() } }
            );
            
            return res.json({
                success: true,
                message: `Friend request from ${senderName} rejected`
            });
        }
    } catch (error) {
        console.error('Error processing friend request response:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error processing friend request' 
        });
    }
});

// Add route for viewing a specific user's friends
app.get('/friends/:username', preventCaching, (req, res) => {
    console.log(`Route hit: /friends/${req.params.username}`);
    res.sendFile(path.join(templatePath, 'friends.html'));
});

// Add route for friends page
app.get('/friends', preventCaching, (req, res) => {
    res.sendFile(path.join(templatePath, 'friends.html'));
});

// Add endpoint to get another user's friends list
app.get('/api/friends/:username', async (req, res) => {
    try {
        const currentUsername = req.headers['x-username'];
        const targetUsername = req.params.username;
        
        console.log(`API Request: Get friends list for ${targetUsername} by ${currentUsername}`);
        
        if (!currentUsername) {
            console.log('Error: User not authenticated');
            return res.status(401).json({ error: 'User not authenticated' });
        }
        
        // Check if the target user exists
        const targetUser = await collection.findOne({ username: targetUsername });
        if (!targetUser) {
            console.log(`Error: User not found - ${targetUsername}`);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if users are friends or if viewing own friends
        if (currentUsername !== targetUsername) {
            const areFriends = await Friend.findOne({
                $or: [
                    { user: currentUsername, friend: targetUsername },
                    { user: targetUsername, friend: currentUsername }
                ]
            });
            
            if (!areFriends) {
                console.log(`Error: Not friends - ${currentUsername} and ${targetUsername}`);
                return res.status(403).json({ error: 'You must be friends with this user to view their friends list' });
            }
        }

        // Support for pagination
        const limit = req.query.limit ? parseInt(req.query.limit) : 100;
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const skip = (page - 1) * limit;
        
        // Find friends with pagination
        const friendships = await Friend.find({ user: targetUsername }).skip(skip).limit(limit);
        const totalCount = await Friend.countDocuments({ user: targetUsername });
        
        console.log(`Found ${friendships.length} friends for ${targetUsername} (page ${page} of ${Math.ceil(totalCount / limit)})`);
        
        if (friendships.length === 0) {
            return res.json({ 
                friends: [],
                pagination: {
                    total: totalCount,
                    page: page,
                    limit: limit,
                    pages: Math.ceil(totalCount / limit)
                }
            });
        }
        
        // Get friend usernames
        const friendUsernames = friendships.map(f => f.friend);
        
        // Get profile details for each friend
        const friendProfiles = await collection.find({ 
            username: { $in: friendUsernames } 
        });
        
        // Format friend data with online status
        const friends = friendProfiles.map(profile => {
            const isOnline = isUserOnline(profile.username);
            return {
                username: profile.username,
                displayName: profile.displayName || profile.username,
                profilePic: profile.profilePic || '/images/default-profile.png',
                isOnline: isOnline,
                lastSeen: isOnline ? null : profile.lastSeen
            };
        });
        
        // Sort friends: online first, then by username
        friends.sort((a, b) => {
            // First sort by online status
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            
            // Then sort by username/displayName alphabetically
            return a.displayName.localeCompare(b.displayName);
        });
        
        console.log(`Sending ${friends.length} formatted friends`);
        res.json({ 
            friends,
            pagination: {
                total: totalCount,
                page: page,
                limit: limit,
                pages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Error getting user friends list:', error);
        res.status(500).json({ error: 'Error getting friends list' });
    }
});

// Add a cleanup task for pending registrations (could be run periodically)
// This would remove accounts that never completed registration
const cleanupPendingRegistrations = async () => {
    try {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        const result = await collection.deleteMany({
            registrationStatus: 'pending',
            createdAt: { $lt: oneDayAgo }
        });
        
        console.log(`Cleaned up ${result.deletedCount} pending registrations`);
    } catch (error) {
        console.error('Error cleaning up pending registrations:', error);
    }
};

// Run the cleanup on server start and then every 24 hours
cleanupPendingRegistrations();
setInterval(cleanupPendingRegistrations, 24 * 60 * 60 * 1000);

// Update listen method to use the HTTP server instead of Express app
const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
})

// Add route for media upload
app.post("/upload-media", upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // Convert buffer to base64
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        // Upload to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(dataURI, {
            folder: "chat_media",
            resource_type: "auto" // Automatically detect resource type
        });

        res.json({ 
            url: uploadResponse.secure_url,
            type: req.file.mimetype
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: "Failed to upload file" });
    }
});

// Format gender for consistent display
function formatGender(gender) {
    if (!gender) return "Not specified";
    
    // Normalize to lowercase for comparison
    const normalizedGender = gender.toLowerCase();
    
    if (normalizedGender === 'male') return 'Male';
    if (normalizedGender === 'female') return 'Female';
    if (normalizedGender === 'other') return 'Other';
    
    // For any other value, return as is
    return gender;
}

// API to get user profile by username
app.get("/api/user/:username", async(req, res) => {
    try {
        const username = req.params.username;
        if (!username) {
            return res.status(400).json({ error: "Username is required" });
        }

        // Find user
        const user = await collection.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if user is online
        const isOnline = isUserOnline(username);

        // Return user profile info
        const response = {
            username: user.username,
            displayName: user.displayName || user.username,
            bio: user.bio || "",
            profilePic: user.profilePic || "/images/default-profile.png",
            joinDate: user.createdAt,
            gender: formatGender(user.gender),
            dob: user.dateOfBirth || null,
            isOnline: isOnline,
            lastSeen: isOnline ? null : user.lastSeen
        };
        
        res.json(response);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: "Error fetching user profile" });
    }
});