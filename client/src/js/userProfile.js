document.addEventListener('DOMContentLoaded', function() {
    const currentUsername = localStorage.getItem('username');
    if (!currentUsername) {
        window.location.href = '/login';
        return;
    }

    // Get username from the URL
    const urlPath = window.location.pathname;
    const targetUsername = urlPath.split('/').pop();
    
    // If viewing your own profile via /user/[your-username], redirect to /profile
    if (targetUsername === currentUsername) {
        window.location.href = '/profile';
        return;
    }
    
    // Fetch and display user profile data
    fetchUserProfile(targetUsername);
    
    // Add event listener for send message button
    document.getElementById('sendMessageBtn').addEventListener('click', function() {
        // Redirect to the private messaging page with this user
        window.location.href = `/messages/${targetUsername}`;
    });

    // Add event listener for friend button
    document.getElementById('friendBtn').addEventListener('click', function() {
        handleFriendAction(targetUsername);
    });
    
    // Connect to Socket.io to get real-time online status updates
    connectToSocketIO(targetUsername);
});

// Set up socket connection and online status tracking
let socket;
const onlineUsers = new Set();

function connectToSocketIO(targetUsername) {
    const username = localStorage.getItem('username');
    
    // Connect to Socket.io
    socket = io({
        auth: { username }
    });
    
    // Handle connection
    socket.on('connect', () => {
        console.log('Connected to chat server for profile online status');
        
        // Start sending heartbeats every minute to keep online status
        setInterval(() => {
            socket.emit('heartbeat');
        }, 60 * 1000); // every minute
    });
    
    // Handle online users list
    socket.on('online users', (users) => {
        onlineUsers.clear();
        users.forEach(user => onlineUsers.add(user));
        
        // Update online status indicator
        updateOnlineStatus(targetUsername);
    });
    
    // Handle user status updates
    socket.on('user status', (data) => {
        if (data.status === 'online') {
            onlineUsers.add(data.username);
        } else {
            onlineUsers.delete(data.username);
        }
        
        // Only update UI if it's the user we're viewing
        if (data.username === targetUsername) {
            updateOnlineStatus(targetUsername);
            
            // If user went offline, we need to refresh the page to get the latest lastSeen time
            if (data.status === 'offline') {
                fetchUserProfile(targetUsername);
            }
        }
    });
}

// Update the online status indicator in the UI
function updateOnlineStatus(username) {
    const isOnline = onlineUsers.has(username);
    
    // Remove existing status indicator if any
    const existingStatus = document.getElementById('onlineStatusIndicator');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    // Add new status indicator text next to username
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'onlineStatusIndicator';
    statusIndicator.className = `user-status ${isOnline ? 'online' : 'offline'}`;
    
    if (isOnline) {
        statusIndicator.innerHTML = '<i class="bi bi-circle-fill"></i> Online';
    } else {
        // Get last seen time from the stored user data
        let lastSeenText = 'Offline';
        
        // First try to get it from the element we created
        const lastSeenData = document.getElementById('userLastSeen')?.dataset?.lastSeen;
        
        if (lastSeenData) {
            lastSeenText = 'Last seen: ' + formatLastSeen(lastSeenData);
        }
        
        statusIndicator.innerHTML = `<i class="bi bi-circle"></i> ${lastSeenText}`;
    }
    
    // Add to the profile info after the username
    const usernameEl = document.getElementById('userUsername');
    
    if (usernameEl && usernameEl.parentNode) {
        usernameEl.parentNode.insertBefore(statusIndicator, usernameEl.nextSibling);
    } else {
        // Fallback - try to add it to the profile-info
        const profileInfo = document.querySelector('.profile-info');
        if (profileInfo) {
            profileInfo.appendChild(statusIndicator);
        }
    }
}

// Format last seen date
function formatLastSeen(lastSeenDate) {
    if (!lastSeenDate) return 'unknown';
    
    const lastSeen = new Date(lastSeenDate);
    const now = new Date();
    const diffSeconds = Math.floor((now - lastSeen) / 1000);
    
    if (diffSeconds < 60) {
        return 'just now';
    } else if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffSeconds < 86400) {
        const hours = Math.floor(diffSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffSeconds < 604800) {
        const days = Math.floor(diffSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        return lastSeen.toLocaleDateString();
    }
}

async function fetchUserProfile(username) {
    try {
        const currentUsername = localStorage.getItem('username');
        
        // First, fetch basic user data
        const response = await fetch(`/api/user/${encodeURIComponent(username)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-username': currentUsername
            }
        });
        
        if (!response.ok) {
            // Handle 404 not found or other errors
            if (response.status === 404) {
                notifications.error("User Not Found", "This user does not exist.");
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const userData = await response.json();
        
        // If this is the current user's profile, redirect to /profile
        if (userData.username === currentUsername) {
            window.location.href = '/profile';
            return;
        }
        
        // Fetch friendship status separately
        const friendshipStatus = await fetchFriendshipStatus(username);
        if (friendshipStatus) {
            userData.friendshipStatus = friendshipStatus;
        }
        
        // Fetch friend count separately
        try {
            const friendCount = await fetchFriendCount(username);
            userData.friendCount = friendCount;
        } catch (error) {
            console.error('Error fetching friend count:', error);
            userData.friendCount = 0;
        }
        
        // Update page with user data
        updateUserProfileUI(userData);
        
        // Check if the API already provides online status
        if (userData.isOnline !== undefined) {
            // Store in our local tracking
            if (userData.isOnline) {
                onlineUsers.add(username);
            } else {
                onlineUsers.delete(username);
            }
            
            // Update the UI
            updateOnlineStatus(username);
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        notifications.error("Error", "Failed to load user profile.");
    }
}

async function fetchFriendshipStatus(username) {
    try {
        const currentUsername = localStorage.getItem('username');
        
        const response = await fetch(`/api/friends/status/${encodeURIComponent(username)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-username': currentUsername
            }
        });
        
        if (!response.ok) {
            console.error(`Failed to fetch friendship status: ${response.status}`);
            return null;
        }
        
        const data = await response.json();
        
        return data.status;
    } catch (error) {
        console.error('Error fetching friendship status:', error);
        return null;
    }
}

async function fetchFriendCount(username) {
    try {
        const response = await fetch(`/api/friends/${encodeURIComponent(username)}?limit=1`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-username': localStorage.getItem('username')
            }
        });
        
        if (!response.ok) {
            if (response.status === 403) {
                // User is not authorized to view friends, just return 0
                return 0;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.pagination?.total || 0;
    } catch (error) {
        console.error('Error fetching friend count:', error);
        return 0;
    }
}

function updateUserProfileUI(userData) {
    document.title = `TG - ${userData.displayName}'s Profile`;
    
    // Update profile picture
    const profilePic = document.getElementById('userProfilePic');
    if (profilePic) {
        profilePic.src = userData.profilePic || '/images/default-profile.png';
        profilePic.alt = `${userData.displayName}'s Profile Picture`;
    }
    
    // Update display name and username
    const displayNameEl = document.getElementById('userDisplayName');
    const usernameEl = document.getElementById('userUsername');
    if (displayNameEl) displayNameEl.textContent = userData.displayName;
    if (usernameEl) usernameEl.textContent = `@${userData.username}`;
    
    // Store last seen time in a hidden element for reference
    let lastSeenEl = document.getElementById('userLastSeen');
    if (!lastSeenEl) {
        lastSeenEl = document.createElement('div');
        lastSeenEl.id = 'userLastSeen';
        lastSeenEl.style.display = 'none';
        const userInfoEl = document.querySelector('.profile-info');
        if (userInfoEl) {
            userInfoEl.appendChild(lastSeenEl);
        } else {
            document.body.appendChild(lastSeenEl);
        }
    }
    
    if (userData.lastSeen) {
        lastSeenEl.dataset.lastSeen = userData.lastSeen;
    }
    
    // Update friend count
    const friendCountEl = document.getElementById('userFriendCount');
    if (friendCountEl) {
        friendCountEl.textContent = userData.friendCount || 0;
    }
    
    // Set up friends link
    const friendsLink = document.getElementById('userFriendsLink');
    if (friendsLink) {
        friendsLink.href = `/friends/${userData.username}`;
    }
    
    // Format date of birth if present
    let formattedDob = 'Not specified';
    
    if (userData.dob) {
        try {
            const dobDate = new Date(userData.dob);
            
            // Check if it's a valid date
            if (!isNaN(dobDate.getTime())) {
                // First check if it's a default/placeholder date (like 0000-01-01)
                const year = dobDate.getFullYear();
                if (year <= 1) {
                    formattedDob = 'Not specified';
                } else {
                    // Format a valid date
                    formattedDob = dobDate.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                }
            }
        } catch (e) {
            console.error('Error formatting date:', e);
        }
    }
    
    // Update gender and DOB
    const genderEl = document.getElementById('userGender');
    const dobEl = document.getElementById('userDob');
    
    if (genderEl) {
        // Just use whatever was provided by the API
        genderEl.textContent = userData.gender || 'Not specified';
    }
    
    if (dobEl) {
        dobEl.textContent = formattedDob;
    }
    
    // Update friendship status UI
    if (userData.friendshipStatus) {
        updateFriendshipUI(userData.friendshipStatus, userData.username);
    } else {
        // If no friendship status is provided, set a default
        const friendshipStatusEl = document.getElementById('friendshipStatus');
        if (friendshipStatusEl) friendshipStatusEl.textContent = 'Not friends';
    }
    
    // Update the online status indicator immediately after updating the UI
    if (!userData.isOnline && userData.lastSeen) {
        updateOnlineStatus(userData.username);
    }
}

function formatFriendshipStatus(status) {
    switch(status) {
        case 'friends':
            return 'Friends';
        case 'pending_sent':
            return 'Friend request sent';
        case 'pending_received':
            return 'Friend request received';
        case 'not_friends':
        default:
            return 'Not friends';
    }
}

async function handleFriendAction(username) {
    try {
        const currentUsername = localStorage.getItem('username');
        
        const response = await fetch(`/api/friends/action/${encodeURIComponent(username)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-username': currentUsername
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            notifications.success(data.title, data.message);
            
            // Update friendship status
            const newStatus = await fetchFriendshipStatus(username);
            if (newStatus) {
                updateFriendshipUI(newStatus, username);
            }
            
            // Update friend count if needed
            if (newStatus === 'friends' || newStatus === 'not_friends') {
                const friendCount = await fetchFriendCount(username);
                const friendCountEl = document.getElementById('userFriendCount');
                if (friendCountEl) {
                    friendCountEl.textContent = friendCount;
                }
            }
        } else {
            notifications.error('Error', data.message || 'Failed to perform friend action');
        }
    } catch (error) {
        console.error('Error performing friend action:', error);
        notifications.error('Error', 'Failed to perform friend action');
    }
}

function updateFriendshipUI(status, username) {
    const friendBtn = document.getElementById('friendBtn');
    const friendshipStatus = document.getElementById('friendshipStatus');
    
    if (!friendBtn || !friendshipStatus) return;
    
    // Remove all classes first
    friendBtn.classList.remove('friend-btn', 'pending-btn', 'remove-friend-btn');
    
    switch(status) {
        case 'friends':
            friendBtn.textContent = 'Remove Friend';
            friendBtn.classList.add('remove-friend-btn');
            friendBtn.innerHTML = '<i class="bi bi-person-dash-fill"></i>Remove Friend';
            friendshipStatus.textContent = 'Friends';
            break;
            
        case 'pending_sent':
            friendBtn.textContent = 'Request Pending';
            friendBtn.classList.add('pending-btn');
            friendBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>Request Pending';
            friendshipStatus.textContent = 'Friend Request Sent';
            break;
            
        case 'pending_received':
            friendBtn.textContent = 'Accept Request';
            friendBtn.classList.add('friend-btn');
            friendBtn.innerHTML = '<i class="bi bi-person-check-fill"></i>Accept Request';
            friendshipStatus.textContent = 'Friend Request Received';
            break;
            
        case 'not_friends':
        default:
            friendBtn.textContent = 'Add Friend';
            friendBtn.classList.add('friend-btn');
            friendBtn.innerHTML = '<i class="bi bi-person-plus-fill"></i>Add Friend';
            friendshipStatus.textContent = 'Not Friends';
            break;
    }
} 