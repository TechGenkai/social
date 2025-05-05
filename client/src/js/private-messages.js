// Private messaging functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const username = localStorage.getItem('username');
    if (!username) {
        window.location.href = '/login';
        return;
    }

    console.log('Messages page loaded for user:', username);
    
    // Global variables
    let activeConversation = null;
    let activeUserData = null;  // Store active user data for reference
    let lastMessageWrapper = null;
    let lastMessageTime = null;
    let lastMessageSender = null;
    let isGrouping = false;
    let onlineUsers = new Set();
    let replyToMessage = null;
    let tempMedia = null; // Add tempMedia variable to store temporary media before sending

    // Add a style tag for the no-scroll class if not already present
    if (!document.querySelector('style#private-messages-styles')) {
        const styleTag = document.createElement('style');
        styleTag.id = 'private-messages-styles';
        styleTag.textContent = `
            .loading-messages-no-scroll {
                scroll-behavior: auto !important;
                overflow-anchor: none !important;
            }
            
            /* Stabilize message containers during scrolling */
            .message-container {
                transform: translateZ(0);
                will-change: transform;
                contain: layout style paint;
            }
            
            /* Prevent individual elements from flying around */
            .message-wrapper, .message-profile-pic, .message-content, 
            .message, .message-text {
                will-change: transform;
                transform: translateZ(0);
                transition: none !important;
            }
            
            /* Smoother media animations */
            .message-media img, .message-media video {
                contain: layout style paint;
                will-change: transform;
            }
            
            /* Prevent layout shifts during scrolling */
            #messages {
                contain: layout style;
                position: relative;
            }
            
            /* Force GPU acceleration for smoother scrolling */
            #messages.smooth-scroll {
                scroll-behavior: smooth;
            }
            
            #messages.no-smooth-scroll {
                scroll-behavior: auto;
            }
            
            /* Improved read indicator styling */
            .read-indicator {
                display: inline-flex;
                align-items: center;
                color: rgba(0, 255, 255, 0.8);
                opacity: 0.9;
                position: absolute;
                right: 6px;
                bottom: 2px;
                font-size: 0.8rem;
                z-index: 2;
            }
            
            /* Special positioning for short messages */
            .read-wrapper {
                display: inline-flex;
                margin-left: 4px;
                margin-right: 0;
                position: relative;
                vertical-align: middle;
                height: 100%;
                align-items: center;
            }
            
            .read-indicator.after-message {
                position: relative;
                right: auto;
                bottom: auto;
                margin-left: 0;
                margin-right: 0;
                vertical-align: middle;
                line-height: 1;
                padding: 0 2px;
            }
            
            /* For better alignment in short messages */
            .read-indicator.after-message i {
                font-size: 12px;
                line-height: 1;
            }
            
            /* Make space for read indicators */
            .message-own:not(.short-message) .message-text {
                padding-right: 22px;
                display: inline-block;
            }
            
            /* For short messages, use consistent sizing and prevent overflow */
            .message.short-message {
                display: inline-flex;
                align-items: center;
                padding: 6px 12px;
                white-space: nowrap;
                flex-direction: row;
                justify-content: flex-end;
                max-width: fit-content;
                min-width: 40px;
                border-radius: 5px !important;
                box-sizing: border-box;
                margin: 2px 0;
            }
            
            /* Apply consistent styling to both own and other short messages */
            .message-own.short-message,
            .message-other.short-message {
                border-radius: 5px !important;
            }
            
            .message.short-message .message-text {
                padding-right: 0;
                order: 1;
            }
            
            .message.short-message .read-wrapper {
                order: 2;
            }
            
            /* For consecutive short messages with read receipts */
            .message.short-message.consecutive-message {
                display: inline-flex;
                align-items: center;
                justify-content: flex-end;
                margin-top: 2px;
            }
            
            /* Online status indicator in conversation list */
            .online-indicator {
                position: absolute;
                bottom: 0;
                right: 0;
                width: 12px;
                height: 12px;
                background-color: #4CAF50;
                border-radius: 50%;
                border: 2px solid #191919;
                box-shadow: 0 1px 2px rgba(0,0,0,0.2);
                transform: translate(2px, 2px); /* Move slightly out from the circle edge */
                z-index: 2; /* Ensure indicator appears above the image */
            }
            
            /* Online status indicator in chat header */
            .user-status {
                display: inline-flex;
                align-items: center;
                font-size: 0.8rem;
                margin-left: 8px;
                color: rgba(255, 255, 255, 0.7);
            }
            
            .user-status.online {
                color: #4CAF50;
            }
            
            .user-status.offline {
                color: rgba(255, 255, 255, 0.5);
            }
            
            .user-status i {
                margin-right: 4px;
                font-size: 0.9rem;
            }
            
            /* Position wrapper for profile pic to accommodate status indicator */
            .conversation-profile-pic {
                position: relative;
                overflow: visible; /* Prevent cropping of indicators */
                z-index: 1;
            }
            
            .conversation-profile-pic img {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                object-fit: cover;
            }
            
            /* Ensure unread indicators are visible and not cropped */
            .unread-indicator {
                position: absolute;
                top: -5px;
                right: -5px;
                background-color: #f218d9;
                color: white;
                font-size: 11px;
                min-width: 18px;
                height: 18px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #191919;
                z-index: 3;
            }
            
            /* Message badge for navbar and sidebar */
            /* Styles now in style.css */
            
            /* Special styling for sidebar badge */
            /* Styles now in style.css */
            
            /* Hover effect */
            /* Styles now in style.css */
            
            .message {
                position: relative; /* Ensure position is relative for absolute positioning of action buttons */
                max-width: 85%;
                padding: 8px 12px;
                margin-bottom: 5px;
                border-radius: 15px;
                overflow-wrap: break-word;
                word-wrap: break-word;
                word-break: break-word;
                z-index: 1; /* Ensure proper stacking context for hover effects */
            }
            
            .message-own {
                background-color: rgba(255, 255, 255, 0.2) !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                color: #fff;
                margin-left: auto;
                border-bottom-right-radius: 5px;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }
            
            .message-other {
                background-color: rgba(255, 255, 255, 0.15) !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                color: #fff;
                margin-right: auto;
                border-bottom-left-radius: 5px;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }
            
            /* Add a more specific rule for message actions in consecutive messages */
            .consecutive-message .message-actions {
                top: -15px;
            }
            
            .message-own .message-actions {
                right: 5px;
                left: auto;
            }
            
            .message-other .message-actions {
                left: 5px;
                right: auto;
            }
            
            .action-button {
                background: transparent;
                border: none;
                color: rgba(242, 242, 242, 0.85);
                font-size: 14px;
                padding: 4px 8px;
                cursor: pointer;
                margin: 0 2px;
                border-radius: 15px;
                transition: all 0.2s;
            }
            
            .action-button:hover {
                background-color: rgba(242, 24, 217, 0.3);
                color: white;
                transform: scale(1.1);
                box-shadow: 0 0 8px rgba(242, 24, 217, 0.5);
            }
            
            .reply-container {
                background-color: rgba(30, 30, 40, 0.8);
                border-left: 3px solid #f218d9;
                padding: 6px 10px;
                margin-bottom: 6px;
                border-radius: 4px;
                font-size: 0.9em;
                position: relative;
            }
            
            .reply-username {
                color: #f218d9;
                font-weight: bold;
                margin-right: 5px;
            }
            
            .reply-text {
                color: #ccc;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 90%;
            }
            
            .reply-close {
                position: absolute;
                right: 5px;
                top: 5px;
                background: transparent;
                border: none;
                color: #999;
                cursor: pointer;
                font-size: 14px;
            }
            
            .reaction-menu {
                display: none;
                position: fixed;
                background-color: rgba(30, 30, 40, 0.95);
                border-radius: 20px;
                padding: 4px 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                border: 1px solid rgba(242, 24, 217, 0.3);
            }
            
            .reaction-emoji-list {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 2px;
            }
            
            .reaction-emoji {
                font-size: 16px;
                margin: 0 5px;
                padding: 5px;
                cursor: pointer;
                border-radius: 50%;
                transition: all 0.2s;
            }
            
            .reaction-emoji:hover {
                background-color: rgba(242, 24, 217, 0.3);
                transform: scale(1.2);
            }
            
            .message-reactions {
                display: flex;
                flex-wrap: wrap;
                margin-top: 4px;
                gap: 4px;
            }
            
            .reaction-badge {
                display: inline-flex;
                align-items: center;
                background-color: rgba(30, 30, 40, 0.8);
                border-radius: 12px;
                padding: 2px 6px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid transparent;
            }
            
            .reaction-badge:hover {
                background-color: rgba(242, 24, 217, 0.2);
                border-color: rgba(242, 24, 217, 0.5);
            }
            
            .reaction-badge.user-reacted {
                background-color: rgba(242, 24, 217, 0.25);
                border-color: rgba(242, 24, 217, 0.5);
            }
            
            .reaction-count {
                margin-left: 2px;
                font-size: 11px;
                color: #ccc;
            }
            
            .reply-info {
                display: flex;
                align-items: center;
                background-color: rgba(30, 30, 40, 0.8);
                border-left: 3px solid #f218d9;
                padding: 5px 8px;
                margin-bottom: 4px;
                border-radius: 4px;
                font-size: 0.85em;
                max-width: 90%;
                cursor: pointer;
                transition: background-color 0.2s ease;
            }
            
            .reply-info:hover {
                background-color: rgba(242, 24, 217, 0.2);
            }
            
            .reply-avatar {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                margin-right: 5px;
                display: inline-block;
            }
            
            /* Message highlight animation */
            @keyframes highlightPulse {
                0% { background-color: rgba(242, 24, 217, 0); }
                25% { background-color: rgba(242, 24, 217, 0.3); }
                50% { background-color: rgba(242, 24, 217, 0.2); }
                75% { background-color: rgba(242, 24, 217, 0.15); }
                100% { background-color: rgba(242, 24, 217, 0); }
            }
            
            .highlight-message {
                animation: highlightPulse 2s ease;
                border-radius: 8px;
            }
            
            /* Position for consecutive messages */
            .consecutive-message {
                position: relative; /* Ensure consecutive messages have position relative */
            }
            
            /* For consecutive messages, maintain the same side positioning as regular messages */
            .consecutive-message.message-own .message-actions {
                left: -80px;
                right: auto;
                top: 50%;
                transform: translateY(-50%);
                position: absolute;
            }
            
            .consecutive-message.message-other .message-actions {
                right: -80px;
                left: auto;
                top: 50%;
                transform: translateY(-50%);
                position: absolute;
            }
        `;
        document.head.appendChild(styleTag);
    }
    
    // Function to highlight the messages link in sidebar
    function highlightMessagesInSidebar() {
        // Remove active class from all sidebar links
        document.querySelectorAll('.sidebar a').forEach(link => {
            link.classList.remove('active');
        });
        
        // Find and highlight the messages link
        const messagesLinks = document.querySelectorAll('.sidebar a[href="/messages"]');
        if (messagesLinks.length > 0) {
            messagesLinks.forEach(link => {
                link.classList.add('active');
            });
            console.log('Messages link highlighted in sidebar');
        } else {
            // Fallback to finding by content or image alt
            const allSidebarLinks = document.querySelectorAll('.sidebar a');
            allSidebarLinks.forEach(link => {
                const text = link.textContent?.trim();
                const img = link.querySelector('img');
                const alt = img ? img.getAttribute('alt') : '';
                
                if (text === 'Messages' || alt === 'Messages') {
                    link.classList.add('active');
                    console.log('Messages link found by text/alt and highlighted');
                }
            });
        }
    }
    
    // Highlight the messages link in sidebar immediately
    highlightMessagesInSidebar();

    // DOM elements
    const conversationsContainer = document.getElementById('conversations');
    const chatContainer = document.getElementById('chat-container');
    const emptyState = document.getElementById('empty-state');
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-message');
    const userNameElement = document.getElementById('chat-user-name');
    const userPicElement = document.getElementById('chat-user-pic');
    const userProfileLink = document.getElementById('user-profile-link');
    const conversationSearchInput = document.getElementById('conversation-search');
    const mediaUploadButton = document.getElementById('media-upload');
    const mediaInput = document.getElementById('media-input');
    
    // Add mobile conversation toggle functionality
    function setupMobileConversationToggle() {
        const chatHeader = document.getElementById('chat-header');
        const conversationsHeader = document.querySelector('.conversations-header');
        const conversationsList = document.querySelector('.conversations-list');
        
        // Function to toggle conversations list
        function toggleConversationsList() {
            conversationsList.classList.toggle('active');
        }
        
        // Add click event to chat header to show conversations
        if (chatHeader) {
            chatHeader.addEventListener('click', function(e) {
                // Only toggle if we're on mobile (check window width)
                if (window.innerWidth <= 768) {
                    // Don't toggle if clicking on the user profile link
                    if (e.target.closest('#user-profile-link')) {
                        return;
                    }
                    toggleConversationsList();
                }
            });
        }
        
        // Add click event to conversations header to hide conversations
        if (conversationsHeader) {
            conversationsHeader.addEventListener('click', function(e) {
                // Only toggle if we're on mobile
                if (window.innerWidth <= 768) {
                    toggleConversationsList();
                }
            });
        }
        
        // Hide conversations list when a conversation is selected on mobile
        if (conversationsContainer) {
            conversationsContainer.addEventListener('click', function(e) {
                const conversationItem = e.target.closest('.conversation-item');
                if (conversationItem && window.innerWidth <= 768) {
                    // Short delay to allow the conversation to load first
                    setTimeout(() => {
                        conversationsList.classList.remove('active');
                    }, 100);
                }
            });
        }
        
        // Handle window resize to reset mobile view
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                conversationsList.classList.remove('active');
            }
        });
    }
    
    // Call the mobile setup function
    setupMobileConversationToggle();
    
    // Check URL for username parameter
    function checkUrlForUsername() {
        const path = window.location.pathname;
        const match = path.match(/\/messages\/([^\/]+)/);
        if (match && match[1]) {
            return decodeURIComponent(match[1]);
        }
        return null;
    }
    
    // Handle media upload
    mediaUploadButton.addEventListener('click', () => {
        mediaInput.click();
    });
    
    mediaInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            notifications.error('File Too Large', 'Maximum file size is 5MB');
            return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            notifications.error('Invalid File Type', 'Only images and videos are allowed');
            return;
        }
        
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        
        // Show upload started notification
        const notificationId = notifications.info('Uploading Media', 'Starting upload...', 0);
        
        try {
            const response = await fetch('/upload-media', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Upload failed');
            }
            
            const data = await response.json();
            
            // Update notification to success and auto-close after 3 seconds
            notifications.success('Upload Complete', 'Media uploaded successfully', notificationId, 3000);
            
            // Send the message with media
            socket.emit('private message', {
                recipient: activeConversation,
                text: messageInput.value.trim() || ' ',
                media: {
                    url: data.url,
                    type: data.type
                }
            });
            
            // Clear the input
            messageInput.value = '';
            mediaInput.value = '';
            
        } catch (error) {
            console.error('Upload error:', error);
            notifications.error('Upload Failed', 'Failed to upload media', notificationId, 5000);
        }
    });
    
    // Connect to Socket.io
    const socket = io({
        auth: { 
            username: username
        }
    });
    
    // Handle connection
    socket.on('connect', () => {
        console.log('Connected to chat server');
        loadConversations();
        
        // Check if we have a username in the URL
        const urlUsername = checkUrlForUsername();
        if (urlUsername) {
            console.log('Opening conversation from URL:', urlUsername);
            // Short delay to ensure conversations are loaded first
            setTimeout(() => {
                openConversation(urlUsername);
            }, 500);
        } else {
            // If not opening a specific conversation, update unread badges
            setTimeout(() => {
                updateUnreadMessageBadges();
            }, 1000);
        }
        
        // Start sending heartbeats every minute to keep online status
        setInterval(() => {
            socket.emit('heartbeat');
        }, 60 * 1000); // every minute
    });
    
    // Handle connection errors
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        notifications.error('Connection Error', 'Failed to connect to chat server');
    });
    
    // Track last message sender for grouping
    // Using the global variables declared above
    /* 
    let lastMessageSender = null;
    let lastMessageTime = null;
    let lastMessageWrapper = null;
    */
    
    // Add auto-resize functionality to the message input
    messageInput.addEventListener('input', function() {
        // Reset height to auto to get the right scrollHeight
        this.style.height = 'auto';
        // Set new height based on content (with a max)
        const newHeight = Math.min(this.scrollHeight, 120);
        this.style.height = newHeight + 'px';
    });
    
    // Load conversations list
    function loadConversations() {
        console.log('Loading conversations...');
        fetch('/api/conversations', {
            headers: {
                'x-username': username
            }
        })
        .then(response => {
            if (!response.ok) {
                console.error('Response not OK:', response.status);
                throw new Error('Failed to load conversations');
            }
            return response.json();
        })
        .then(data => {
            console.log('Conversations loaded:', data);
            renderConversations(data.conversations);
        })
        .catch(error => {
            console.error('Error loading conversations:', error);
            conversationsContainer.innerHTML = `
                <div class="error-message">
                    Failed to load conversations. <a href="#" id="retry-load">Retry</a>
                </div>
            `;
            document.getElementById('retry-load')?.addEventListener('click', (e) => {
                e.preventDefault();
                loadConversations();
            });
        });
    }
    
    // Track online users
    // Using the global variable declared above 
    /* const onlineUsers = new Set(); */

    // Render conversations list
    function renderConversations(conversations) {
        if (!conversations || conversations.length === 0) {
            conversationsContainer.innerHTML = `
                <div class="no-conversations">
                    <p>No conversations yet</p>
                    <p>Messages from other users will appear here</p>
                </div>
            `;
            return;
        }
        
        conversationsContainer.innerHTML = '';
        
        conversations.forEach(conv => {
            const conversationItem = document.createElement('div');
            conversationItem.className = 'conversation-item';
            conversationItem.dataset.username = conv.withUser;
            
            if (activeConversation && activeConversation === conv.withUser) {
                conversationItem.classList.add('active');
            }
            
            // Format timestamp properly, handling invalid dates
            let formattedTime = '';
            if (conv.lastMessageTime) {
                const lastMessageDate = new Date(conv.lastMessageTime);
                if (!isNaN(lastMessageDate.getTime())) {
                    formattedTime = formatTime(lastMessageDate);
                }
            }
            
            // Sanitize the last message to preserve emoticons
            const sanitizedLastMessage = sanitizeWithEmoticons(conv.lastMessage || '');
            
            // Check if user is online
            const isOnline = conv.isOnline || onlineUsers.has(conv.withUser);
            
            conversationItem.innerHTML = `
                <div class="conversation-profile-pic">
                    <img src="${conv.withUserProfilePic}" alt="${conv.withUserDisplayName}">
                    ${conv.unreadCount > 0 ? `<div class="unread-indicator">${conv.unreadCount}</div>` : ''}
                    ${isOnline ? '<div class="online-indicator"></div>' : ''}
                </div>
                <div class="conversation-details">
                    <div class="conversation-header">
                        <h4 class="conversation-name">${conv.withUserDisplayName}</h4>
                        <span class="conversation-time">${formattedTime}</span>
                    </div>
                    <p class="conversation-last-message">${sanitizedLastMessage}</p>
                </div>
            `;
            
            conversationItem.addEventListener('click', () => {
                openConversation(conv.withUser);
                // Update URL without reloading
                const url = `/messages/${encodeURIComponent(conv.withUser)}`;
                history.pushState({}, '', url);
            });
            
            conversationsContainer.appendChild(conversationItem);
        });
        
        // Update unread message badges after rendering conversations
        updateUnreadMessageBadges();
    }
    
    // Open conversation
    function openConversation(withUsername) {
        if (!withUsername) return;
        
        console.log('Opening conversation with:', withUsername);
        activeConversation = withUsername;
        
        // Mark the conversation as active
        const conversationItems = document.querySelectorAll('.conversation-item');
        conversationItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.username === withUsername) {
                item.classList.add('active');
            }
        });
        
        // Mark conversation as read when opening
        markConversationAsRead(withUsername);
        
        // Show messages container and hide empty state
        if (chatContainer) {
            chatContainer.style.display = 'flex';
        }
        
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        messagesContainer.classList.add('optimized-scroll');
        
        // Clear messages container
        messagesContainer.innerHTML = '';
        
        // Add loading indicator
        messagesContainer.innerHTML = `
            <div class="loading-messages">
                <div class="loading-spinner">
                    <i class="bi bi-arrow-repeat"></i> Loading messages...
                </div>
            </div>
        `;
        
        // Load conversation history
        fetch(`/api/messages/${encodeURIComponent(withUsername)}`, {
            headers: {
                'x-username': username
            }
        })
        .then(response => {
            if (!response.ok) {
                console.error('Response not OK:', response.status);
                throw new Error('Failed to load messages');
            }
            return response.json();
        })
        .then(data => {
            console.log('Messages loaded:', data);
            
            // Store user data for reference (including lastSeen)
            activeUserData = data.user;
            
            // Add a class to force scroll position to bottom without animation
            messagesContainer.classList.add('loading-messages-no-scroll');
            messagesContainer.classList.add('optimized-scroll');
            
            // Clear loading indicator
            messagesContainer.innerHTML = '';
            
            // Create a div for messages that will be initially hidden
            const messagesWrapper = document.createElement('div');
            messagesWrapper.style.opacity = '0';
            messagesWrapper.style.visibility = 'hidden';
            messagesWrapper.style.transition = 'opacity 0.2s ease-out';
            messagesWrapper.style.willChange = 'opacity, transform';
            messagesWrapper.style.transform = 'translateZ(0)';
            messagesContainer.appendChild(messagesWrapper);
            
            // Update user info in header with online status
            userNameElement.textContent = data.user.displayName;
            userPicElement.src = data.user.profilePic;
            userProfileLink.href = `/user/${data.user.username}`;
            
            // Add or update the user status indicator
            const chatHeaderDetails = document.querySelector('.user-details');
            
            // Remove existing status indicator if any
            const existingStatus = chatHeaderDetails.querySelector('.user-status');
            if (existingStatus) {
                existingStatus.remove();
            }
            
            // Get online status
            const isOnline = data.user.isOnline || onlineUsers.has(data.user.username);
            
            // Create new status indicator
            const statusIndicator = document.createElement('div');
            statusIndicator.className = `user-status ${isOnline ? 'online' : 'offline'}`;
            
            if (isOnline) {
                statusIndicator.innerHTML = '<i class="bi bi-circle-fill"></i> Online';
            } else {
                // Add last seen information if available
                let lastSeenText = 'Offline';
                if (data.user.lastSeen) {
                    lastSeenText = 'Last seen: ' + formatLastSeen(data.user.lastSeen);
                }
                statusIndicator.innerHTML = `<i class="bi bi-circle"></i> ${lastSeenText}`;
            }
            
            statusIndicator.dataset.username = data.user.username;
            
            // Add to the chat header
            chatHeaderDetails.appendChild(statusIndicator);
            
            // Mark messages as read
            socket.emit('mark messages read', { conversationWith: withUsername });
            
            // Process and enhance messages - ensure reply data is properly formatted
            if (data.messages && data.messages.length > 0) {
                // Pre-process messages to enhance reply data
                data.messages.forEach(msg => {
                    // Ensure _id is available and use it as the message ID
                    if (msg.id && !msg._id) {
                        msg._id = msg.id;
                    }
                    
                    // Log reply data for debugging
                    if (msg.replyTo) {
                        console.log('Message has reply data:', msg.replyTo);
                        
                        // Ensure messageId is available in replyTo
                        if (msg.replyTo.id && !msg.replyTo.messageId) {
                            msg.replyTo.messageId = msg.replyTo.id;
                        }
                        
                        // Add isReply flag to message
                        msg.isReply = true;
                    }
                });
                
                // Store original parent to restore later
                const originalMessagesContainer = messagesContainer;
                
                // Use the temporary container for adding messages
                const tempContainer = messagesWrapper;
                
                // Add all messages to the temporary container
                data.messages.forEach(msg => {
                    addMessage(msg, tempContainer);
                });
                
                // Position at bottom immediately before showing messages
                requestAnimationFrame(() => {
                    // Add extra padding at the bottom to ensure full visibility of last message
                    const lastMessageEl = tempContainer.querySelector('.message-container:last-child, .system-message:last-child');
                    if (lastMessageEl) {
                        const paddingEl = document.createElement('div');
                        paddingEl.style.height = '50px'; // Extra padding at bottom
                        paddingEl.style.display = 'block';
                        tempContainer.appendChild(paddingEl);
                    }
                    
                    // Force scroll to bottom before display
                    originalMessagesContainer.scrollTop = originalMessagesContainer.scrollHeight + 8000;
                    
                    // Now show messages with a slight delay
                    setTimeout(() => {
                        // Make the container visible
                        messagesWrapper.style.opacity = '1';
                        messagesWrapper.style.visibility = 'visible';
                        
                        // Keep optimal performance during reveal
                        setTimeout(() => {
                            // One more scroll to ensure we're at the bottom
                            originalMessagesContainer.scrollTop = originalMessagesContainer.scrollHeight + 8000;
                            
                            // Finally remove the performance classes
                            setTimeout(() => {
                                originalMessagesContainer.classList.remove('loading-messages-no-scroll');
                                originalMessagesContainer.classList.remove('optimized-scroll');
                            }, 250);
                        }, 50);
                    }, 30);
                });
            }
            
            // Focus on input
            messageInput.focus();
        })
        .catch(error => {
            console.error('Error loading messages:', error);
            messagesContainer.innerHTML = `
                <div class="error-message">
                    Failed to load conversation. <button id="retry-conversation">Retry</button>
                </div>
            `;
            document.getElementById('retry-conversation')?.addEventListener('click', () => {
                openConversation(withUsername);
            });
        });
    }
    
    // Scroll to bottom of messages container with improved reliability
    function scrollToBottom(smooth = true) {
        // Temporarily add a class to optimize rendering during scrolling
        messagesContainer.classList.add('optimized-scroll');
        
        // If smooth is false, disable smooth scrolling
        if (!smooth) {
            messagesContainer.classList.add('no-smooth-scroll');
            messagesContainer.classList.remove('smooth-scroll');
        } else {
            messagesContainer.classList.add('smooth-scroll');
            messagesContainer.classList.remove('no-smooth-scroll');
        }
        
        // Use a large value to ensure we scroll past the last message
        const targetScrollTop = messagesContainer.scrollHeight + 8000;
        
        // First scroll attempt - immediate
        messagesContainer.scrollTop = targetScrollTop;
        
        // Second scroll attempt - after frame render
        requestAnimationFrame(() => {
            messagesContainer.scrollTop = targetScrollTop;
            
            // Third scroll attempt - with slight delay to handle layout shifts
            setTimeout(() => {
                messagesContainer.scrollTop = targetScrollTop;
                
                // Remove performance optimization classes after scrolling is done
                setTimeout(() => {
                    if (!smooth) {
                        messagesContainer.classList.remove('no-smooth-scroll');
                    }
                    messagesContainer.classList.remove('optimized-scroll');
                }, 100);
            }, 30);
        });
    }
    
    // Send message
    function sendMessage() {
        const text = messageInput.value.trim();
        const hasMedia = !!tempMedia;
        
        if (!activeConversation) {
            console.warn('No active conversation to send message to');
            notifications.error('No Conversation Selected', 'Please select a conversation to send a message.');
            return;
        }
        
        if (!text && !hasMedia && !replyToMessage) {
            console.log('Message is empty and no media attached');
            return;
        }
        
        // Create message data
        const messageData = {
                recipient: activeConversation,
            text: text
        };
        
        // Add media if present
        if (hasMedia) {
            messageData.media = tempMedia;
        }
        
        // Add reply data if replying
        if (replyToMessage) {
            console.log('Adding reply data to message:', replyToMessage);
            
            // Ensure we have a consistent ID format (use id or _id, whichever is available)
            const replyId = replyToMessage.id || replyToMessage._id;
            
            messageData.replyTo = {
                messageId: replyId,
                text: replyToMessage.text || 'Media message',
                username: replyToMessage.isSelf ? username : (replyToMessage.senderDisplayName || replyToMessage.sender),
                timestamp: replyToMessage.timestamp
            };
            
            console.log('Reply data added:', messageData.replyTo);
        }
        
        // Emit to socket.io
        socket.emit('private message', messageData);
        
        // Reset input and media
            messageInput.value = '';
        clearTempMedia();
        
        // Clear reply if any
        clearReply();
        
        // Keep focus on input
        messageInput.focus();
    }
    
    // Handle send button click
    sendButton.addEventListener('click', sendMessage);
    
    // Send message when Enter key is pressed (without Shift)
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Handle private messages from server
    socket.on('private message', (msg) => {
        console.log('Received private message:', msg);
        // If this message is part of the active conversation, add it to the chat
        if (activeConversation === (msg.isSelf ? msg.recipient : msg.sender)) {
            // Use smooth scrolling for incoming messages, immediate for outgoing
            addMessage(msg, false);
            
            // If the message is from the other user, mark as read
            if (!msg.isSelf) {
                socket.emit('mark messages read', { conversationWith: msg.sender });
            }
        } else if (!msg.isSelf) {
            // If it's a new message not in the active conversation, update the UI
            notifications.info('New Message', `${msg.senderDisplayName} sent you a message`);
            // Reload conversations to show the new message
            loadConversations();
            // Update unread message badges
            updateUnreadMessageBadges();
        }
    });
    
    // Handle conversation updates
    socket.on('conversation update', (data) => {
        console.log('Conversation update received:', data);
        // Refresh conversations list
        loadConversations();
        // Update unread message badges
        updateUnreadMessageBadges();
    });
    
    // Handle socket errors
    socket.on('error', (err) => {
        console.error('Socket error:', err);
        notifications.error('Error', err.message || 'An error occurred');
    });
    
    // Handle messages read events
    socket.on('messages read', (data) => {
        console.log('Messages read by:', data.by, 'count:', data.count);
        // Find all messages sent by current user to the reader and mark them as read
        if (activeConversation === data.by) {
            updateMessageReadStatus(data.by);
        }
    });
    
    // Handle online users list
    socket.on('online users', (users) => {
        console.log('Received online users list:', users);
        onlineUsers.clear();
        users.forEach(user => onlineUsers.add(user));
        
        // Update UI for conversations
        updateOnlineStatusInUI();
    });
    
    // Handle user status updates
    socket.on('user status', (data) => {
        console.log('User status update:', data);
        
        if (data.status === 'online') {
            onlineUsers.add(data.username);
        } else {
            onlineUsers.delete(data.username);
        }
        
        // Update UI for this user
        updateOnlineStatusInUI(data.username);
    });
    
    // Function to update read status of messages
    function updateMessageReadStatus(reader) {
        // Get all message elements in the current conversation that are our own 
        // and don't already have a read indicator
        const messageElements = messagesContainer.querySelectorAll('.message.message-own:not(.read)');
        
        messageElements.forEach(messageEl => {
            // Skip if already has read indicator
            if (messageEl.querySelector('.read-indicator')) {
                return;
            }
            
            // Mark the message as read in the UI
            messageEl.classList.add('read');
            
            // Check if this is a short message
            const isShort = messageEl.classList.contains('short-message');
            
            // Add read indicator based on message type
            const textSpan = messageEl.querySelector('.message-text');
            
            if (isShort) {
                // For short messages, append after the message
                const readIndicator = document.createElement('span');
                readIndicator.className = 'read-indicator after-message';
                readIndicator.title = 'Read';
                readIndicator.innerHTML = '<i class="bi bi-check2-all"></i>';
                
                const readWrapper = document.createElement('div');
                readWrapper.className = 'read-wrapper';
                readWrapper.appendChild(readIndicator);
                
                // Ensure the message element uses flexbox to position elements
                messageEl.style.display = 'inline-flex';
                messageEl.style.alignItems = 'center';
                messageEl.style.justifyContent = 'flex-end';
                
                // Set correct order for text and read indicator
                if (textSpan) textSpan.style.order = '1';
                readWrapper.style.order = '2';
                
                messageEl.appendChild(readWrapper);
            } else if (messageEl.classList.contains('consecutive-message') && textSpan) {
                // For consecutive messages, append to the element itself
                const readIndicator = document.createElement('span');
                readIndicator.className = 'read-indicator';
                readIndicator.title = 'Read';
                readIndicator.innerHTML = '<i class="bi bi-check2-all"></i>';
                messageEl.appendChild(readIndicator);
            } else {
                // For regular messages, append to the element itself
                const readIndicator = document.createElement('span');
                readIndicator.className = 'read-indicator';
                readIndicator.title = 'Read';
                readIndicator.innerHTML = '<i class="bi bi-check2-all"></i>';
                messageEl.appendChild(readIndicator);
            }
        });
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

    // Function to update online status indicators in UI
    function updateOnlineStatusInUI(specificUsername = null) {
        // Update conversation list items
        const conversations = document.querySelectorAll('.conversation-item');
        conversations.forEach(conv => {
            const username = conv.dataset.username;
            
            // If we're updating for a specific user only, skip others
            if (specificUsername && username !== specificUsername) {
                return;
            }
            
            const isOnline = onlineUsers.has(username);
            const profilePic = conv.querySelector('.conversation-profile-pic');
            
            // Remove existing indicator if present
            const existingIndicator = profilePic.querySelector('.online-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            // Add indicator if online
            if (isOnline) {
                const indicator = document.createElement('div');
                indicator.className = 'online-indicator';
                profilePic.appendChild(indicator);
            }
        });
        
        // Update status in chat header if in a conversation
        if (activeConversation) {
            const statusIndicator = document.querySelector(`.user-status[data-username="${activeConversation}"]`);
            if (statusIndicator) {
                const isOnline = onlineUsers.has(activeConversation);
                statusIndicator.className = `user-status ${isOnline ? 'online' : 'offline'}`;
                
                if (isOnline) {
                    statusIndicator.innerHTML = '<i class="bi bi-circle-fill"></i> Online';
                } else {
                    // Try to get last seen time from the user data
                    let lastSeenText = 'Offline';
                    const lastSeenData = activeUserData?.lastSeen;
                    
                    if (lastSeenData) {
                        lastSeenText = 'Last seen: ' + formatLastSeen(lastSeenData);
                    }
                    
                    statusIndicator.innerHTML = `<i class="bi bi-circle"></i> ${lastSeenText}`;
                }
            }
        }
    }
    
    // Add a message to the chat
    function addMessage(msg, targetContainer = null) {
        const currentSender = msg.isSelf ? username : msg.sender;
        const currentTime = msg.timestamp;
        const isOwnMessage = msg.isSelf;
        const messageText = msg.text;
        
        // Ensure message has a consistent ID (use _id or id)
        if (!msg._id && msg.id) {
            msg._id = msg.id;
        } else if (!msg.id && msg._id) {
            msg.id = msg._id;
        }
        
        console.log('Processing message in addMessage:', { 
            id: msg.id, 
            _id: msg._id, 
            isReply: msg.replyTo ? 'Yes' : 'No',
            replyToId: msg.replyTo ? (msg.replyTo.messageId || msg.replyTo.id) : 'None'
        });
        
        // Use the provided container or the default messagesContainer
        const container = targetContainer || messagesContainer;
        
        // Create document fragment for better DOM performance
        const fragment = document.createDocumentFragment();
        
        // Check if this message should be grouped with the previous one
        if (shouldGroupMessages(currentSender, currentTime) && lastMessageWrapper) {
            const messageElement = document.createElement('div');
            messageElement.className = 'message ' + 
                (isOwnMessage ? 'message-own' : 'message-other') + ' consecutive-message';
            messageElement.dataset.messageId = msg._id || msg.id; // Store message ID for reactions and replies
            console.log('Storing message ID:', msg._id || msg.id, 'Element:', messageElement);
            
            // Add 'read' class if the message has been read
            if (isOwnMessage && msg.read) {
                messageElement.classList.add('read');
            }
            
            // Check if message is short to apply special styling
            if (isShortMessage(messageText)) {
                messageElement.classList.add('short-message');
            }
            
            // Create actions first - must be before text content
            const actionsDiv = createMessageActions(messageElement, msg);
            messageElement.appendChild(actionsDiv);
            
            const textSpan = document.createElement('span');
            textSpan.className = 'message-text';
            
            // Check if this is a reply message
            if (msg.replyTo && (msg.replyTo.messageId || msg.replyTo.id)) {
                // Ensure we have a messageId to reference (use either messageId or id)
                const replyToId = msg.replyTo.messageId || msg.replyTo.id;
                
                console.log('Creating reply info element for message:', msg._id || msg.id, 'replying to:', replyToId);
                
                const replyInfo = document.createElement('div');
                replyInfo.className = 'reply-info';
                replyInfo.dataset.replyToId = replyToId; // Store directly in the dataset
                
                // Add click event to scroll to original message with debugging
                replyInfo.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Reply clicked, target ID:', replyToId);
                    scrollToOriginalMessage(replyToId);
                });
                
                // Add a reply icon to make it more obvious it's a reply
                const replyIcon = document.createElement('span');
                replyIcon.className = 'reply-icon';
                replyIcon.innerHTML = '↩ ';
                replyIcon.style.color = '#f218d9';
                replyIcon.style.marginRight = '4px';
                replyIcon.style.fontWeight = 'bold';
                replyInfo.appendChild(replyIcon);
                
                const replyUsername = document.createElement('span');
                replyUsername.className = 'reply-username';
                replyUsername.textContent = msg.replyTo.username || "Unknown user";
                
                const replyText = document.createElement('span');
                replyText.className = 'reply-text';
                replyText.textContent = msg.replyTo.text || 'Media message';
                
                replyInfo.appendChild(replyUsername);
                replyInfo.appendChild(replyText);
                textSpan.appendChild(replyInfo);
                
                // Add a data attribute to the message element itself to mark it as a reply
                messageElement.dataset.isReply = "true";
                messageElement.classList.add('has-reply');
            }
            
            // Handle media if present and valid
            if (msg.media && typeof msg.media === 'object' && msg.media.url) {
                const mediaElement = createMediaElement(msg.media);
                if (mediaElement) {
                    textSpan.appendChild(mediaElement);
                }
            }
            
            // Add text if present
            if (msg.text && msg.text.trim()) {
                const textNode = document.createElement('span');
                textNode.innerHTML = formatMessageText(msg.text);
                textSpan.appendChild(textNode);
            }
            
            // Add read indicator for own messages that have been read
            if (isOwnMessage && msg.read) {
                addReadIndicator(messageElement, textSpan, isShortMessage(messageText));
            }
            
            // Add text content after actions
            messageElement.appendChild(textSpan);
            
            // Add reactions if present (after the text)
            if (msg.reactions && msg.reactions.length > 0) {
                updateReactions(messageElement, msg.reactions);
            }
            
            const messageContent = lastMessageWrapper.querySelector('.message-content');
            messageContent.appendChild(messageElement);
            
            lastMessageTime = currentTime;
            
            // Only scroll if we're using the main container (not a temporary one)
            if (!targetContainer) {
                scrollToBottom();
            }
            return;
        }
        
        // Create new message container for non-consecutive messages
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container';
        messageContainer.dataset.username = currentSender;
        
        const messageWrapper = document.createElement('div');
        messageWrapper.className = isOwnMessage ? 'message-wrapper own' : 'message-wrapper';
        messageWrapper.dataset.messageId = msg._id || msg.id;
        
        const profilePic = document.createElement('div');
        profilePic.className = 'message-profile-pic';
        
        const profilePicLink = document.createElement('a');
        profilePicLink.href = isOwnMessage ? '/profile' : `/user/${msg.sender}`;
        profilePicLink.title = `View ${isOwnMessage ? 'your' : `${msg.senderDisplayName}'s`} profile`;
        
        const profileImg = document.createElement('img');
        profileImg.src = isOwnMessage 
            ? (document.getElementById('navProfilePic')?.src || '/images/default-profile.png') 
            : (msg.senderProfilePic || '/images/default-profile.png');
        profileImg.alt = isOwnMessage ? 'You' : (msg.senderDisplayName || msg.sender);
        profileImg.loading = 'lazy'; // Add lazy loading for better performance
        
        profilePicLink.appendChild(profileImg);
        profilePic.appendChild(profilePicLink);
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const header = document.createElement('div');
        header.className = 'message-header';
        
        const sender = document.createElement('a');
        sender.className = 'message-sender';
        sender.textContent = isOwnMessage ? 'You' : (msg.senderDisplayName || msg.sender);
        sender.href = isOwnMessage ? '/profile' : `/user/${msg.sender}`;
        sender.title = `View ${isOwnMessage ? 'your' : `${msg.senderDisplayName}'s`} profile`;
        
        let timestamp;
        if (currentTime) {
            timestamp = document.createElement('span');
            timestamp.className = 'message-time';
            timestamp.textContent = formatTime(new Date(currentTime));
        }
        
        if (isOwnMessage) {
            header.style.flexDirection = 'row-reverse';
            header.style.textAlign = 'right';
            if (timestamp) {
                timestamp.style.marginLeft = '0';
                timestamp.style.marginRight = '8px';
                header.appendChild(timestamp);
            }
            header.appendChild(sender);
        } else {
            header.appendChild(sender);
            if (timestamp) header.appendChild(timestamp);
        }
        
        messageContent.appendChild(header);
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message ' + 
            (isOwnMessage ? 'message-own' : 'message-other');
        messageElement.dataset.messageId = msg._id || msg.id;
        
        // Add 'read' class if the message has been read
        if (isOwnMessage && msg.read) {
            messageElement.classList.add('read');
        }
        
        // Check if message is short to apply special styling
        if (isShortMessage(messageText)) {
            messageElement.classList.add('short-message');
        }
        
        // Create actions first - must be before text content
        const actionsDiv = createMessageActions(messageElement, msg);
        messageElement.appendChild(actionsDiv);
        
        const textSpan = document.createElement('span');
        textSpan.className = 'message-text';
        
        // Check if this is a reply message
        if (msg.replyTo && (msg.replyTo.messageId || msg.replyTo.id)) {
            // Ensure we have a messageId to reference (use either messageId or id)
            const replyToId = msg.replyTo.messageId || msg.replyTo.id;
            
            console.log('Creating reply info element for message:', msg._id || msg.id, 'replying to:', replyToId);
            
            const replyInfo = document.createElement('div');
            replyInfo.className = 'reply-info';
            replyInfo.dataset.replyToId = replyToId; // Store directly in the dataset
            
            // Add click event to scroll to original message with debugging
            replyInfo.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Reply clicked, target ID:', replyToId);
                scrollToOriginalMessage(replyToId);
            });
            
            // Add a reply icon to make it more obvious it's a reply
            const replyIcon = document.createElement('span');
            replyIcon.className = 'reply-icon';
            replyIcon.innerHTML = '↩ ';
            replyIcon.style.color = '#f218d9';
            replyIcon.style.marginRight = '4px';
            replyIcon.style.fontWeight = 'bold';
            replyInfo.appendChild(replyIcon);
            
            const replyUsername = document.createElement('span');
            replyUsername.className = 'reply-username';
            replyUsername.textContent = msg.replyTo.username || "Unknown user";
            
            const replyText = document.createElement('span');
            replyText.className = 'reply-text';
            replyText.textContent = msg.replyTo.text || 'Media message';
            
            replyInfo.appendChild(replyUsername);
            replyInfo.appendChild(replyText);
            textSpan.appendChild(replyInfo);
            
            // Add a data attribute to the message element itself to mark it as a reply
            messageElement.dataset.isReply = "true";
            messageElement.classList.add('has-reply');
        }
        
        // Handle media if present and valid
        if (msg.media && typeof msg.media === 'object' && msg.media.url) {
            const mediaElement = createMediaElement(msg.media);
            if (mediaElement) {
                textSpan.appendChild(mediaElement);
            }
        }
        
        // Add text if present
        if (msg.text && msg.text.trim()) {
            const textNode = document.createElement('span');
            textNode.innerHTML = formatMessageText(msg.text);
            textSpan.appendChild(textNode);
        }
        
        // Add read indicator for own messages that have been read
        if (isOwnMessage && msg.read) {
            addReadIndicator(messageElement, textSpan, isShortMessage(messageText));
        }
        
        // Add text content after actions
        messageElement.appendChild(textSpan);
        
        // Add reactions if present (after the text)
        if (msg.reactions && msg.reactions.length > 0) {
            updateReactions(messageElement, msg.reactions);
        }
        
        messageContent.appendChild(messageElement);
        
        messageWrapper.appendChild(profilePic);
        messageWrapper.appendChild(messageContent);
        
        messageContainer.appendChild(messageWrapper);
        
        // Use fragment for better performance
        fragment.appendChild(messageContainer);
        container.appendChild(fragment);
        
        lastMessageSender = currentSender;
        lastMessageTime = currentTime;
        lastMessageWrapper = messageWrapper;
        
        // Only scroll if we're using the main container (not a temporary one)
        if (!targetContainer) {
            scrollToBottom();
        }
    }
    
    // Check if message is short (for special styling)
    function isShortMessage(messageText) {
        // If empty or very short text, definitely a short message
        if (!messageText || !messageText.trim()) return true;
        
        // Normalize the text to handle emojis and other characters
        const normalizedText = messageText.trim();
        
        // Check character count - using a consistent measure for all messages
        return normalizedText.length <= 30;
    }
    
    // Helper function to add read indicators based on message length
    function addReadIndicator(messageElement, textSpan, isShort) {
        const readIndicator = document.createElement('span');
        readIndicator.className = 'read-indicator';
        readIndicator.title = 'Read';
        
        // Different styling for short vs long messages
        if (isShort) {
            readIndicator.className += ' after-message';
            readIndicator.innerHTML = '<i class="bi bi-check2-all"></i>';
            
            // For short messages, append after the message text but without affecting the layout
            const readWrapper = document.createElement('div');
            readWrapper.className = 'read-wrapper';
            readWrapper.appendChild(readIndicator);
            
            // Make sure the text span and readWrapper are positioned correctly
            if (textSpan) {
                // First find the message-text container (parent of textSpan)
                let messageTextContainer = textSpan.closest('.message-text');
                if (messageTextContainer) {
                    // Add the read wrapper to the message text container
                    // This keeps it in the same area as the text but doesn't interfere with reactions
                    messageTextContainer.appendChild(readWrapper);
                } else {
                    // Fallback: append to the message element
            messageElement.appendChild(readWrapper);
                }
        } else {
                // Fallback: append to the message element
                messageElement.appendChild(readWrapper);
            }
        } else {
            // For longer messages, use the absolute positioning approach
            readIndicator.innerHTML = '<i class="bi bi-check2-all"></i>';
            
            // Position at the bottom right corner of the message element
            readIndicator.style.position = 'absolute';
            readIndicator.style.bottom = '2px';
            readIndicator.style.right = '4px';
            readIndicator.style.zIndex = '10';
            
            messageElement.appendChild(readIndicator);
        }
    }
    
    // Check if messages should be grouped
    function shouldGroupMessages(currentSender, currentTime) {
        // If no previous message or different sender, don't group
        if (!lastMessageSender || lastMessageSender !== currentSender) {
            return false;
        }
        
        // Check if messages are within 2 minutes of each other
        if (currentTime && lastMessageTime) {
            const timeDiff = Math.abs(new Date(currentTime) - new Date(lastMessageTime));
            const twoMinutesInMs = 2 * 60 * 1000;
            return timeDiff < twoMinutesInMs;
        }
        
        return true;
    }
    
    // Function to format message text for display
    function formatMessageText(text) {
        // Use the sanitize function that preserves emoticons and handles line breaks
        return sanitizeWithEmoticonsAndLineBreaks(text);
    }

    // Function to create media element with improved performance
    function createMediaElement(media) {
        // Check if media object is valid and has a URL
        if (!media || typeof media !== 'object' || !media.url) {
            return document.createElement('div');
        }

        const mediaContainer = document.createElement('div');
        mediaContainer.className = 'message-media';
        mediaContainer.style.transform = 'translateZ(0)'; // Hardware acceleration
        mediaContainer.style.willChange = 'transform'; // Indicate to browser optimization
        
        let mediaElement;
        
        // Check if media.type exists and is a string
        if (media.type && typeof media.type === 'string') {
            const isImage = media.type === 'image' || media.type.startsWith('image/');
            const isVideo = media.type === 'video' || media.type.startsWith('video/');
            
            if (isImage) {
                mediaElement = document.createElement('img');
                mediaElement.src = media.url;
                mediaElement.alt = 'Shared image';
                mediaElement.loading = 'lazy'; // Add lazy loading
                
                // Add width/height to prevent layout shifts
                mediaElement.style.width = '100%';
                mediaElement.style.maxHeight = '300px';
                mediaElement.style.objectFit = 'contain';
            } else if (isVideo) {
                mediaElement = document.createElement('video');
                mediaElement.src = media.url;
                mediaElement.controls = true;
                mediaElement.playsInline = true;
                mediaElement.preload = 'metadata'; // Just load metadata initially
                
                // Add width/height to prevent layout shifts
                mediaElement.style.width = '100%';
                mediaElement.style.maxHeight = '300px';
            } else {
                // For unknown types, create a link
                mediaElement = document.createElement('a');
                mediaElement.href = media.url;
                mediaElement.target = '_blank';
                mediaElement.textContent = media.name || 'View Media';
                mediaElement.className = 'media-link';
                return mediaContainer;
            }
        } else {
            // If media.type is missing, try to guess from URL
            const url = media.url.toLowerCase();
            if (url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || 
                url.endsWith('.gif') || url.endsWith('.webp')) {
                mediaElement = document.createElement('img');
                mediaElement.src = media.url;
                mediaElement.alt = 'Shared image';
                mediaElement.loading = 'lazy'; // Add lazy loading
                
                // Add width/height to prevent layout shifts
                mediaElement.style.width = '100%';
                mediaElement.style.maxHeight = '300px';
                mediaElement.style.objectFit = 'contain';
            } else if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg')) {
                mediaElement = document.createElement('video');
                mediaElement.src = media.url;
                mediaElement.controls = true;
                mediaElement.playsInline = true;
                mediaElement.preload = 'metadata'; // Just load metadata initially
                
                // Add width/height to prevent layout shifts
                mediaElement.style.width = '100%';
                mediaElement.style.maxHeight = '300px';
            } else {
                // For unknown extensions, create a link
                mediaElement = document.createElement('a');
                mediaElement.href = media.url;
                mediaElement.target = '_blank';
                mediaElement.textContent = media.name || 'View Media';
                mediaElement.className = 'media-link';
                return mediaContainer;
            }
        }

        // Apply performance optimizations to media elements
        mediaElement.style.transform = 'translateZ(0)';
        mediaElement.style.willChange = 'transform';
        
        // Create media overlay with performance optimizations
        const overlay = document.createElement('div');
        overlay.className = 'media-overlay';
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        overlay.style.position = 'fixed';
        
        const overlayContent = document.createElement('div');
        overlayContent.className = 'media-overlay-content';
        overlayContent.style.transform = 'translateZ(0)';
        
        // Create a new media element for the overlay instead of cloning
        let overlayMediaElement;
        if (mediaElement.tagName === 'IMG') {
            overlayMediaElement = document.createElement('img');
            overlayMediaElement.src = media.url;
            overlayMediaElement.alt = 'Full size image';
            overlayMediaElement.loading = 'lazy';
        } else if (mediaElement.tagName === 'VIDEO') {
            overlayMediaElement = document.createElement('video');
            overlayMediaElement.src = media.url;
            overlayMediaElement.controls = true;
            overlayMediaElement.playsInline = true;
            overlayMediaElement.preload = 'metadata';
        }
        
        if (overlayMediaElement) {
            overlayContent.appendChild(overlayMediaElement);
            overlay.appendChild(overlayContent);
            
            // Add click handler to close overlay when clicking outside media content
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.style.opacity = '0';
                    overlay.style.visibility = 'hidden';
                    setTimeout(() => {
                        if (overlay.parentNode) {
                            overlay.parentNode.removeChild(overlay);
                        }
                    }, 200);
                }
            });
            
            // Add click handler to show overlay when clicking on media
            mediaElement.addEventListener('click', () => {
                document.body.appendChild(overlay);
                // Force reflow before animating
                overlay.offsetHeight;
                overlay.style.opacity = '1';
                overlay.style.visibility = 'visible';
                if (overlayMediaElement.tagName === 'VIDEO') {
                    overlayMediaElement.play();
                }
            });
        }
        
        mediaContainer.appendChild(mediaElement);
        return mediaContainer;
    }
    
    // Format time for display
    function formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    // Handle conversation search
    conversationSearchInput.addEventListener('input', debounce(function() {
        const query = this.value.trim().toLowerCase();
        const conversations = document.querySelectorAll('.conversation-item');
        let matchFound = false;
        
        conversations.forEach(conv => {
            const name = conv.querySelector('.conversation-name').textContent.toLowerCase();
            const lastMessage = conv.querySelector('.conversation-last-message').textContent.toLowerCase();
            const username = conv.dataset.username.toLowerCase();
            
            if (name.includes(query) || lastMessage.includes(query) || username.includes(query)) {
                conv.style.display = 'flex';
                matchFound = true;
            } else {
                conv.style.display = 'none';
            }
        });
        
        // Get the no-results element or create it if it doesn't exist
        let noResultsEl = document.querySelector('.conversations .no-results');
        
        if (!matchFound && query.length > 0) {
            // If no conversations matched and we don't already have a no-results element
            if (!noResultsEl) {
                noResultsEl = document.createElement('div');
                noResultsEl.className = 'no-results';
                noResultsEl.innerHTML = `
                    <i class="bi bi-search"></i>
                    <p>No conversations found matching "${query}"</p>
                `;
                conversationsContainer.appendChild(noResultsEl);
            } else {
                // Update existing no-results element
                noResultsEl.innerHTML = `
                    <i class="bi bi-search"></i>
                    <p>No conversations found matching "${query}"</p>
                `;
                noResultsEl.style.display = 'flex';
            }
        } else if (noResultsEl) {
            // If we have matches or empty query, hide the no-results element
            noResultsEl.style.display = 'none';
        }
    }, 300));
    
    // Debounce function to limit how often a function can be called
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
    
    // Fix home link navigation with more reliable method
    const homeLinks = document.querySelectorAll('a.home-link, a[href="/"]');
    homeLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/';
        });
    });
    
    // Update navbar message icon with link to messages
    const navbarMessageIcon = document.querySelector('.nav-icons a:first-child');
    if (navbarMessageIcon) {
        navbarMessageIcon.href = '/messages';
    }
    
    // Set correct title based on page
    document.title = 'Messages | Tech Genkai';

    // Add a optimized scroll handler for manual scrolling
    let isScrolling = false;
    let scrollTimeout;
    
    messagesContainer.addEventListener('scroll', function() {
        if (!isScrolling) {
            isScrolling = true;
            messagesContainer.classList.add('optimized-scroll');
        }
        
        // Clear previous timeout
        clearTimeout(scrollTimeout);
        
        // Set new timeout to remove class after scrolling stops
        scrollTimeout = setTimeout(function() {
            messagesContainer.classList.remove('optimized-scroll');
            isScrolling = false;
        }, 150);
    });

    // Add wheel event listener to prevent stutter during fast scrolling
    messagesContainer.addEventListener('wheel', function(e) {
        // Check if it's a fast scroll
        if (Math.abs(e.deltaY) > 50) {
            messagesContainer.classList.add('no-smooth-scroll');
            
            // Remove the class after scrolling ends
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(function() {
                messagesContainer.classList.remove('no-smooth-scroll');
                messagesContainer.classList.remove('optimized-scroll');
                isScrolling = false;
            }, 250);
        }
    }, { passive: true });

    // Prevent touchmove events from causing stutter on mobile
    messagesContainer.addEventListener('touchmove', function() {
        if (!isScrolling) {
            isScrolling = true;
            messagesContainer.classList.add('optimized-scroll');
            messagesContainer.classList.add('no-smooth-scroll');
        }
        
        // Clear previous timeout
        clearTimeout(scrollTimeout);
        
        // Set new timeout to remove class after scrolling stops
        scrollTimeout = setTimeout(function() {
            messagesContainer.classList.remove('optimized-scroll');
            messagesContainer.classList.remove('no-smooth-scroll');
            isScrolling = false;
        }, 250);
    }, { passive: true });

    // Function to add a system message
    function addSystemMessage(text, targetContainer = null) {
        // Create a system message element
        const systemMessage = document.createElement('div');
        systemMessage.className = 'system-message';
        
        // Sanitize the text
        const sanitizedText = sanitizeWithEmoticons(text);
        
        systemMessage.innerHTML = sanitizedText;
        
        // Add to the specified container or default messagesContainer
        const container = targetContainer || messagesContainer;
        container.appendChild(systemMessage);
        
        // Only scroll if we're not using a target container
        if (!targetContainer) {
            scrollToBottom();
        }
    }

    // Function to update unread message badges in navbar and sidebar
    function updateUnreadMessageBadges() {
        // Get all conversation items to count total unread messages
        const conversationItems = document.querySelectorAll('.conversation-item');
        let totalUnread = 0;
        
        // Count all unread messages
        conversationItems.forEach(item => {
            const unreadIndicator = item.querySelector('.unread-indicator');
            if (unreadIndicator) {
                const count = parseInt(unreadIndicator.textContent);
                if (!isNaN(count)) {
                    totalUnread += count;
                }
            }
        });
        
        console.log('Total unread messages:', totalUnread);
        
        // No longer adding badge to navbar message icon
        
        // Update sidebar message icon badge
        const sidebarMessageIcon = document.querySelector('.sidebar a[title="Messages"]') || 
                                  document.querySelector('.sidebar a[href="/messages"]');
        
        if (sidebarMessageIcon) {
            // Remove existing badge if present
            const existingBadge = sidebarMessageIcon.querySelector('.message-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Add badge if there are unread messages
            if (totalUnread > 0) {
                const badge = document.createElement('div');
                badge.className = 'message-badge';
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                sidebarMessageIcon.style.position = 'relative';
                sidebarMessageIcon.appendChild(badge);
            }
        }
        
        // Save the unread count to localStorage so other pages can access it
        localStorage.setItem('unreadMessageCount', totalUnread);
    }

    // Mark conversation as read
    function markConversationAsRead(username) {
        if (!username) return;
        
        console.log('Attempting to mark conversation as read:', username);
        
        // Use socket.io method directly instead of failed API endpoint
        socket.emit('mark messages read', { conversationWith: username });
        
        // Update UI to reflect read status
                const conversationItem = document.querySelector(`.conversation-item[data-username="${username}"]`);
                if (conversationItem) {
                    const unreadIndicator = conversationItem.querySelector('.unread-indicator');
                    if (unreadIndicator) {
                        unreadIndicator.remove();
                    }
                }
        
        // Update unread badges
                updateUnreadMessageBadges();
            }

    // Create a reaction menu element
    const reactionMenu = document.createElement('div');
    reactionMenu.className = 'reaction-menu';
    reactionMenu.innerHTML = `
        <div class="reaction-emoji-list">
            <span class="reaction-emoji" data-emoji="👍">👍</span>
            <span class="reaction-emoji" data-emoji="❤️">❤️</span>
            <span class="reaction-emoji" data-emoji="😂">😂</span>
            <span class="reaction-emoji" data-emoji="😮">😮</span>
            <span class="reaction-emoji" data-emoji="😢">😢</span>
            <span class="reaction-emoji" data-emoji="👏">👏</span>
            <span class="reaction-emoji" data-emoji="🔥">🔥</span>
            <span class="reaction-emoji" data-emoji="🙏">🙏</span>
        </div>
    `;
    document.body.appendChild(reactionMenu);
    
    // Add CSS for reply and reaction features
    if (!document.querySelector('style#reply-reaction-styles')) {
        const styleTag = document.createElement('style');
        styleTag.id = 'reply-reaction-styles';
        styleTag.textContent = `
            /* Enhanced reply styling */
            .has-reply {
                position: relative;
                margin-top: 8px !important;
                border-top: 1px solid rgba(242, 24, 217, 0.1);
                padding-top: 5px;
            }
            
            .has-reply::before {
                content: '↩';
                position: absolute;
                top: -15px;
                left: 10px;
                color: #f218d9;
                font-size: 14px;
                font-weight: bold;
                background: rgba(30, 30, 40, 0.7);
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                border: 1px solid rgba(242, 24, 217, 0.3);
            }
            
            /* For right-aligned messages */
            .message-own.has-reply::before {
                left: auto;
                right: 10px;
            }
            
            /* Make reply info more visually distinctive */
            .reply-info {
                display: flex;
                align-items: center;
                background-color: rgba(30, 30, 40, 0.8);
                border-left: 3px solid #f218d9;
                padding: 5px 8px;
                margin-bottom: 4px;
                border-radius: 4px;
                font-size: 0.85em;
                max-width: 90%;
                cursor: pointer;
                transition: background-color 0.2s ease;
                position: relative;
                overflow: hidden;
            }
            
            .reply-info:hover {
                background-color: rgba(242, 24, 217, 0.2);
            }
            
            /* Improved styling for reply username */
            .reply-username {
                color: #f218d9;
                font-weight: bold;
                margin-right: 5px;
                text-shadow: 0 0 1px rgba(0,0,0,0.5);
            }
            
            /* Improved styling for reply text */
            .reply-text {
                color: #ddd;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 90%;
                font-style: italic;
            }
            
            .message-actions {
                display: none;
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                background-color: rgba(30, 30, 40, 0.9);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                border-radius: 20px;
                padding: 5px 10px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                z-index: 200; /* Increased z-index to ensure it shows above any other elements */
                transition: all 0.2s ease;
                border: 1px solid rgba(242, 24, 217, 0.3);
                pointer-events: auto; /* Ensure clicks work properly */
                align-items: center;
                justify-content: center;
                gap: 5px;
            }
            
            /* Show action buttons when hovering over message */
            .message:hover .message-actions {
                display: flex !important; /* Force display with !important */
            }
            
            /* Specifically target consecutive messages to show actions on hover */
            .consecutive-message:hover .message-actions {
                display: flex !important;
            }
            
            /* Maintain visibility when hovering over the actions themselves */
            .message-actions:hover {
                display: flex !important;
            }
            
            .message-container .message:hover .message-actions,
            div.message:hover .message-actions,
            div.consecutive-message:hover .message-actions {
                display: flex !important; /* Additional specificity */
            }
            
            /* Position for own messages - on the left side */
            .message-own .message-actions {
                left: -80px;
                right: auto;
            }
            
            /* Position for other users' messages - on the right side */
            .message-other .message-actions {
                right: -80px;
                left: auto;
            }
            
            /* Responsive adjustment for mobile */
            @media (max-width: 768px) {
                .message-own .message-actions {
                    left: -70px;
                }
                
                .message-other .message-actions {
                    right: -70px;
                }
            }
            
            /* For very small screens */
            @media (max-width: 480px) {
                .message-own .message-actions {
                    left: -55px;
                }
                
                .message-other .message-actions {
                    right: -55px;
                }
            }
            
            .action-button {
                background: transparent;
                border: none;
                color: rgba(242, 242, 242, 0.95);
                font-size: 15px;
                padding: 5px 10px;
                cursor: pointer;
                margin: 0 2px;
                border-radius: 15px;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 30px;
                height: 30px;
            }
            
            .action-button:hover {
                background-color: rgba(242, 24, 217, 0.3);
                color: white;
                transform: scale(1.1);
                box-shadow: 0 0 8px rgba(242, 24, 217, 0.5);
            }
            
            .reply-container {
                background-color: rgba(30, 30, 40, 0.8);
                border-left: 3px solid #f218d9;
                padding: 6px 10px;
                margin-bottom: 6px;
                border-radius: 4px;
                font-size: 0.9em;
                position: relative;
            }
            
            .reply-close {
                position: absolute;
                right: 5px;
                top: 5px;
                background: transparent;
                border: none;
                color: #999;
                cursor: pointer;
                font-size: 14px;
            }
            
            .reaction-menu {
                display: none;
                position: fixed;
                background-color: rgba(30, 30, 40, 0.95);
                border-radius: 20px;
                padding: 4px 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                border: 1px solid rgba(242, 24, 217, 0.3);
            }
            
            .reaction-emoji-list {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 2px;
            }
            
            .reaction-emoji {
                font-size: 18px;
                padding: 5px;
                cursor: pointer;
                border-radius: 50%;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 26px;
                height: 26px;
            }
            
            .reaction-emoji:hover {
                background-color: rgba(242, 24, 217, 0.3);
                transform: scale(1.2);
            }
            
            .message-reactions {
                display: flex;
                flex-wrap: wrap;
                margin-top: 4px;
                gap: 4px;
            }
            
            .reaction-badge {
                display: inline-flex;
                align-items: center;
                background-color: rgba(30, 30, 40, 0.8);
                border-radius: 12px;
                padding: 2px 6px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid transparent;
            }
            
            .reaction-badge:hover {
                background-color: rgba(242, 24, 217, 0.2);
                border-color: rgba(242, 24, 217, 0.5);
            }
            
            .reaction-badge.user-reacted {
                background-color: rgba(242, 24, 217, 0.25);
                border-color: rgba(242, 24, 217, 0.5);
            }
            
            .reaction-count {
                margin-left: 2px;
                font-size: 11px;
                color: #ccc;
            }
            
            .reply-avatar {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                margin-right: 5px;
                display: inline-block;
            }
            
            /* Message highlight animation */
            @keyframes highlightPulse {
                0% { background-color: rgba(242, 24, 217, 0); }
                25% { background-color: rgba(242, 24, 217, 0.3); }
                50% { background-color: rgba(242, 24, 217, 0.2); }
                75% { background-color: rgba(242, 24, 217, 0.15); }
                100% { background-color: rgba(242, 24, 217, 0); }
            }
            
            .highlight-message {
                animation: highlightPulse 2s ease;
                border-radius: 8px;
            }
            
            /* Position for consecutive messages */
            .consecutive-message {
                position: relative; /* Ensure consecutive messages have position relative */
            }
            
            /* For consecutive messages, maintain the same side positioning as regular messages */
            .consecutive-message.message-own .message-actions {
                left: -80px;
                right: auto;
                top: 50%;
                transform: translateY(-50%);
                position: absolute;
            }
            
            .consecutive-message.message-other .message-actions {
                right: -80px;
                left: auto;
                top: 50%;
                transform: translateY(-50%);
                position: absolute;
            }
        `;
        document.head.appendChild(styleTag);
    }
    
    // Create reply indicator element (initially hidden)
    const replyIndicator = document.createElement('div');
    replyIndicator.id = 'reply-indicator';
    replyIndicator.className = 'reply-container';
    replyIndicator.style.display = 'none';
    replyIndicator.innerHTML = `
        <span class="reply-username"></span>
        <span class="reply-text"></span>
        <button class="reply-close"><i class="bi bi-x"></i></button>
    `;
    
    // Insert reply indicator before the input area
    const chatInputContainer = document.querySelector('.chat-input-container');
    if (chatInputContainer) {
        chatInputContainer.parentNode.insertBefore(replyIndicator, chatInputContainer);
        
        // Add event listener for closing reply
        const replyCloseButton = replyIndicator.querySelector('.reply-close');
        replyCloseButton.addEventListener('click', function() {
            clearReply();
        });
    }
    
    // Function to clear the current reply
    function clearReply() {
        replyToMessage = null;
        replyIndicator.style.display = 'none';
        replyIndicator.querySelector('.reply-username').textContent = '';
        replyIndicator.querySelector('.reply-text').textContent = '';
    }
    
    // Function to set up reply
    function setupReply(message) {
        // Log the message object for debugging
        console.log('Setting up reply to message:', message);
        
        // Ensure message.id is used if _id is not available
        const messageId = message._id || message.id;
        
        replyToMessage = {
            ...message,
            id: messageId // Ensure ID is consistently stored
        };
        
        // Set the reply indicator content
        replyIndicator.querySelector('.reply-username').textContent = 
            message.isSelf ? 'You' : (message.senderDisplayName || message.sender);
        
        // Truncate text if it's too long
        let replyText = message.text || 'Media message';
        if (replyText.length > 50) {
            replyText = replyText.substring(0, 47) + '...';
        }
        
        replyIndicator.querySelector('.reply-text').textContent = replyText;
        replyIndicator.style.display = 'block';
        
        // Store the message ID directly in the indicator for debugging
        replyIndicator.dataset.replyToId = messageId;
        
        // Focus on message input
        messageInput.focus();
    }
    
    // Function to create message actions (reply/react)
    function createMessageActions(messageElement, msg) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        // Get the message ID, ensure we have one
        const messageId = msg.id || msg._id || (messageElement && messageElement.dataset && messageElement.dataset.messageId);
        
        if (!messageId) {
            console.error('Cannot create message actions: Missing message ID', msg);
            return actionsDiv; // Return empty actions div
        }
        
        // Reply button
        const replyButton = document.createElement('button');
        replyButton.className = 'action-button reply-btn';
        replyButton.innerHTML = '<i class="bi bi-reply"></i>';
        replyButton.title = 'Reply';
        replyButton.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const messageToReply = {
                _id: messageId,
                text: msg.text,
                username: msg.username,
                timestamp: msg.timestamp || msg.createdAt
            };
            
            console.log('Setting up reply to message:', messageToReply);
            setupReply(messageToReply);
        });
        actionsDiv.appendChild(replyButton);
        
        // React button
        const reactButton = document.createElement('button');
        reactButton.className = 'action-button react-btn';
        reactButton.innerHTML = '<i class="bi bi-emoji-smile"></i>';
        reactButton.title = 'React';
        reactButton.addEventListener('click', function(e) {
            e.stopPropagation();
            
            console.log('React button clicked for message ID:', messageId);
            
            if (messageId) {
                showReactionMenu(e, messageId);
            } else {
                console.error("Cannot react to message: missing message ID");
                if (typeof notifications !== 'undefined') {
                    notifications.error('Error', 'Cannot react to this message');
                }
            }
        });
        actionsDiv.appendChild(reactButton);
        
        return actionsDiv;
    }
    
    // Function to show the reaction menu
    function showReactionMenu(event, messageId) {
        console.log('Opening reaction menu for message:', messageId);
        
        if (!messageId) {
            console.error('No messageId provided for reaction menu');
            return;
        }
        
        if (!activeConversation) {
            console.error('No active conversation for reaction menu');
            return;
        }
        
        console.log('Active conversation:', activeConversation);
        
        // Get clicked button (react button)
        const reactButton = event.currentTarget;
        if (!reactButton) {
            console.error('Could not determine which button was clicked');
            return;
        }
        
        console.log('React button clicked:', reactButton);
        
        // Check if reactionMenu element exists globally or create it
        let reactionMenu = document.getElementById('reaction-menu');
        if (!reactionMenu) {
            console.error('Reaction menu element not found. Creating it now.');
            // Create the menu element if it doesn't exist
            reactionMenu = document.createElement('div');
            reactionMenu.id = 'reaction-menu';
            reactionMenu.className = 'reaction-menu';
            reactionMenu.innerHTML = `
                <div class="reaction-emoji-list">
                    <span class="reaction-emoji" data-emoji="👍">👍</span>
                    <span class="reaction-emoji" data-emoji="❤️">❤️</span>
                    <span class="reaction-emoji" data-emoji="😂">😂</span>
                    <span class="reaction-emoji" data-emoji="😮">😮</span>
                    <span class="reaction-emoji" data-emoji="😢">😢</span>
                    <span class="reaction-emoji" data-emoji="👏">👏</span>
                    <span class="reaction-emoji" data-emoji="🔥">🔥</span>
                    <span class="reaction-emoji" data-emoji="🙏">🙏</span>
                </div>
            `;
            document.body.appendChild(reactionMenu);
            
            // Add event listeners to reaction emojis
            reactionMenu.querySelectorAll('.reaction-emoji').forEach(emoji => {
                emoji.addEventListener('click', function() {
                    const menuMessageId = reactionMenu.dataset.messageId;
                    const conversationWith = reactionMenu.dataset.conversationWith;
                    
                    // Verify messageId and conversationWith are not undefined
                    if (!menuMessageId || !conversationWith) {
                        console.error("Cannot send reaction: missing data", { menuMessageId, conversationWith });
                        if (typeof notifications !== 'undefined') {
                            notifications.error('Error', 'Cannot react to this message');
                        }
                        closeReactionMenu();
                        return;
                    }
                    
                    console.log("Sending reaction for private message ID:", menuMessageId);
                    const emojiValue = this.dataset.emoji;
                    
                    // Find the message element for immediate UI update
                    const messageElement = document.querySelector(`.message-bubble[data-message-id="${menuMessageId}"]`);
                    
                    if (messageElement) {
                        // Get current reactions from the element's dataset
                        let currentReactions = [];
                        if (messageElement.dataset.reactions) {
                            try {
                                currentReactions = JSON.parse(messageElement.dataset.reactions);
                            } catch (e) {
                                console.error("Error parsing existing reactions:", e);
                                currentReactions = [];
                            }
                        }
                        
                        // Toggle the reaction (add if not exists, remove if exists)
                        const existingIndex = currentReactions.findIndex(r => 
                            r.emoji === emojiValue && r.username === username
                        );
                        
                        if (existingIndex >= 0) {
                            // Remove existing reaction
                            currentReactions.splice(existingIndex, 1);
                        } else {
                            // Add new reaction
                            currentReactions.push({
                                emoji: emojiValue,
                                username: username,
                                timestamp: new Date()
                            });
                        }
                        
                        // Update the dataset with modified reactions
                        messageElement.dataset.reactions = JSON.stringify(currentReactions);
                        
                        // Update message structure to ensure proper order
                        // 1. Get the message text and timestamp
                        const messageText = messageElement.querySelector('.message-text');
                        const timestamp = messageElement.querySelector('.message-time');
                        
                        // Ensure proper DOM structure: text -> reactions -> timestamp
                        updateReactions(messageElement, currentReactions);
                    }
                    
                    // Send the reaction to the server
                    socket.emit('private message reaction', {
                        messageId: menuMessageId,
                        conversationWith: conversationWith,
                        emoji: emojiValue
                    });
                    
                    // Close the menu
                    closeReactionMenu();
                });
            });
        }
        
        // Position the menu above the clicked button
        const buttonRect = reactButton.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Set menu size to calculate its dimensions
        reactionMenu.style.display = 'block';
        reactionMenu.style.visibility = 'hidden';
        
        // Get menu dimensions after making it temporarily visible 
        const menuRect = reactionMenu.getBoundingClientRect();
        const menuHeight = menuRect.height;
        const menuWidth = menuRect.width;
        
        // Hide menu again until we position it
        reactionMenu.style.visibility = '';
        
        // Position menu above the button by default
        let top = buttonRect.top - menuHeight - 10; // 10px padding
        let left = buttonRect.left - (menuWidth / 2) + (buttonRect.width / 2);
        
        console.log('Initial position calculation:', { top, left, buttonRect, menuHeight, menuWidth });
        
        // Ensure menu stays in viewport - vertical
        if (top < 10) {
            // If not enough space above, place it below the button
            top = buttonRect.bottom + 10;
            console.log('Not enough space above, positioning below:', top);
        }
        
        // Ensure menu stays in viewport - horizontal
        if (left < 10) {
            left = 10;
        } else if (left + menuWidth > viewportWidth - 10) {
            left = viewportWidth - menuWidth - 10;
        }
        
        console.log('Final position:', { top, left });
        
        // Set menu position
        reactionMenu.style.top = `${top}px`;
        reactionMenu.style.left = `${left}px`;
        
        // Store the message ID and conversation partner
        reactionMenu.dataset.messageId = messageId;
        reactionMenu.dataset.conversationWith = activeConversation;
        
        // Ensure the menu has high z-index
        reactionMenu.style.zIndex = "2000";
        
        // Show the menu
        reactionMenu.style.display = 'block';
        
        console.log('Reaction menu should now be visible');
        
        // Add click outside listener to close menu
        setTimeout(() => {
            document.addEventListener('click', closeReactionMenu);
        }, 10);
        
        // Prevent the click from immediately closing the menu
        event.stopPropagation();
    }
    
    // Function to close the reaction menu
    function closeReactionMenu() {
        console.log('Attempting to close reaction menu');
        const reactionMenu = document.getElementById('reaction-menu');
        if (reactionMenu) {
            console.log('Found reaction menu, hiding it');
            reactionMenu.style.display = 'none';
            
            // Clear associated data
            if (reactionMenu.dataset) {
                reactionMenu.dataset.messageId = '';
                reactionMenu.dataset.conversationWith = '';
            }
        } else {
            console.log('No reaction menu found to close');
        }
        
        // Remove the document click listener
        document.removeEventListener('click', closeReactionMenu);
    }
    
    // Add event listeners to reaction emojis
    reactionMenu.querySelectorAll('.reaction-emoji').forEach(emoji => {
        emoji.addEventListener('click', function(e) {
            e.stopPropagation();
            const messageId = reactionMenu.dataset.messageId;
            const conversationWith = reactionMenu.dataset.conversationWith;
            
            // Verify messageId and conversationWith are not undefined
            if (!messageId || !conversationWith) {
                console.error("Cannot send reaction: missing data", { messageId, conversationWith });
                if (typeof notifications !== 'undefined') {
                    notifications.error('Error', 'Cannot react to this message');
                }
                closeReactionMenu();
                return;
            }
            
            console.log("Sending reaction for private message ID:", messageId);
            const emojiValue = this.dataset.emoji;
            
            // Send the reaction to the server
            socket.emit('private message reaction', {
                messageId: messageId,
                conversationWith: conversationWith,
                emoji: emojiValue
            });
            
            // Close the menu
            closeReactionMenu();
        });
    });
    
    // Function to create or update reaction badges for a message
    function updateReactions(messageElement, reactions) {
        console.log('Updating reactions for message:', messageElement, reactions);
        
        // Sometimes messageElement might be the message container instead of the bubble
        let container = messageElement;
        
        // If this is a container, try to find the bubble inside
        if (container.classList.contains('message-container')) {
            container = container.querySelector('.message-bubble') || container.querySelector('.message');
            console.log('Found bubble inside container:', container);
        }
        
        if (!container) {
            console.error('Could not find valid container for reactions');
            return;
        }
        
        // Find the existing reactions container
        let reactionsContainer = container.querySelector('.message-reactions');
        
        // If no reactions, remove the container if it exists and return
        if (!reactions || reactions.length === 0) {
            if (reactionsContainer) {
                reactionsContainer.remove();
            }
            return;
        }
        
        // Create a new reactions container if it doesn't exist or recreate it to ensure correct positioning
        if (reactionsContainer) {
            reactionsContainer.remove();
        }
        
        // Create fresh reactions container
        reactionsContainer = document.createElement('div');
        reactionsContainer.className = 'message-reactions';
        
        // Group reactions by emoji
        const emojiCounts = {};
        reactions.forEach(reaction => {
            if (!reaction.emoji) {
                console.warn('Reaction without emoji found:', reaction);
                return;
            }
            
            if (!emojiCounts[reaction.emoji]) {
                emojiCounts[reaction.emoji] = {
                    count: 0,
                    usernames: [],
                    userReacted: false
                };
            }
            emojiCounts[reaction.emoji].count++;
            
            // Use username or sender field
            const reactionUser = reaction.username || reaction.sender || 'Unknown';
            emojiCounts[reaction.emoji].usernames.push(reactionUser);
            
            // Check if current user reacted
            if (reactionUser === username) {
                emojiCounts[reaction.emoji].userReacted = true;
            }
        });
        
        console.log('Grouped emoji counts:', emojiCounts);
        
        // Create badge for each emoji reaction - display horizontally
        for (const emoji in emojiCounts) {
            const badge = document.createElement('span');
            badge.className = 'reaction-badge';
            if (emojiCounts[emoji].userReacted) {
                badge.classList.add('user-reacted');
            }
            
            // Set title with usernames who reacted
            const usersList = emojiCounts[emoji].usernames.map(name => 
                name === username ? 'You' : name
            ).join(', ');
            badge.title = `${usersList} reacted with ${emoji}`;
            
            // Add emoji and count
            badge.innerHTML = `
                ${emoji} <span class="reaction-count">${emojiCounts[emoji].count}</span>
            `;
            
            // Add click handler to toggle reaction
            badge.addEventListener('click', function() {
                const msgId = container.dataset.messageId || messageElement.dataset.messageId;
                console.log('Clicking reaction badge for message:', msgId, 'emoji:', emoji);
                
                if (!msgId) {
                    console.error('Cannot find message ID for reaction');
                    return;
                }
                
                socket.emit('private message reaction', {
                    messageId: msgId,
                    conversationWith: activeConversation,
                    emoji: emoji
                });
            });
            
            reactionsContainer.appendChild(badge);
        }
        
        // Position the reactions container after the message text but before the timestamp
        const messageText = container.querySelector('.message-text');
        const timestamp = container.querySelector('.message-time');
        
        // Ensure reactions are after the message text
        if (messageText && messageText.nextSibling) {
            // If there's a sibling after message text, insert before it
            container.insertBefore(reactionsContainer, messageText.nextSibling);
        } else if (timestamp) {
            // If there's a timestamp, insert before it
            container.insertBefore(reactionsContainer, timestamp);
        } else {
            // If neither conditions apply, just append at the end
            container.appendChild(reactionsContainer);
        }
        
        console.log('Updated reactions container:', reactionsContainer);
    }

    // Update addMessageToChat to handle replies and reactions
    function addMessageToChat(messageData, prepend = false, animate = true) {
        console.log('Adding message to chat:', messageData);
        
        const messageId = messageData._id || messageData.id;
        if (!messageId) {
            console.error('Message has no ID:', messageData);
            return null;
        }
        
        // Create message container
        const messageElement = document.createElement('div');
        messageElement.className = 'message-wrapper';
        messageElement.dataset.messageId = messageId;
        
        if (messageData.replyTo && messageData.replyTo.messageId) {
            messageElement.dataset.isReply = 'true';
        }
        
        // Determine if message is from current user
        const isOwn = messageData.isSelf || messageData.username === username;
        
        // Add own class if necessary
        if (isOwn) {
            messageElement.classList.add('own');
        }
        
        // Create message content with bubble
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Create message bubble
        const messageBubble = document.createElement('div');
        messageBubble.className = `message-bubble ${isOwn ? 'own' : 'other'}`;
        messageBubble.dataset.messageId = messageId; // Store message ID on bubble too
        
        // Use flexbox with column direction to ensure correct ordering
        messageBubble.style.display = 'flex';
        messageBubble.style.flexDirection = 'column';
        
        // Store reactions in dataset for immediate UI updates
        if (messageData.reactions && messageData.reactions.length > 0) {
            messageBubble.dataset.reactions = JSON.stringify(messageData.reactions);
        } else {
            messageBubble.dataset.reactions = JSON.stringify([]);
        }
        
        // Create message text container
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        
        // Add reply info if this is a reply
        if (messageData.replyTo) {
            console.log('Creating reply info for message:', messageId, 'replying to:', messageData.replyTo.messageId);
            const replyInfo = document.createElement('div');
            replyInfo.className = 'reply-info';
            
            // Set avatar and username for the reply
            const replyName = messageData.replyTo.username === username ? 'You' : messageData.replyTo.username;
            
            // Truncate reply text if too long
            let replyText = messageData.replyTo.text || 'Media message';
            if (replyText.length > 30) {
                replyText = replyText.substring(0, 27) + '...';
            }
            
            replyInfo.innerHTML = `
                <img class="reply-avatar" src="/images/default-profile.png">
                <span class="reply-username">${replyName}: </span>
                <span class="reply-text">${replyText}</span>
            `;
            
            // Add click event to scroll to original message
            replyInfo.style.cursor = 'pointer';
            replyInfo.title = 'Click to see original message';
            replyInfo.addEventListener('click', function() {
                scrollToOriginalMessage(messageData.replyTo.messageId);
            });
            
            messageText.appendChild(replyInfo);
        }
        
        // Add message text content
        let textSpan;
        if (messageData.text) {
            textSpan = document.createElement('span');
            textSpan.innerHTML = formatMessageText(messageData.text);
            messageText.appendChild(textSpan);
        }
        
        // Add message text to bubble (FIRST)
        messageBubble.appendChild(messageText);
        
        // Add timestamp (LAST)
        const timestamp = document.createElement('div');
        timestamp.className = 'message-time';
        timestamp.textContent = formatTime(new Date(messageData.timestamp || messageData.createdAt));
        
        // Add message actions (these will be positioned absolute)
        const actionsDiv = createMessageActions(messageBubble, messageData);
        messageBubble.appendChild(actionsDiv);
        
        // Add the complete message to the container
        messageContent.appendChild(messageBubble);
        messageElement.appendChild(messageContent);
        
        // Add read indicator if this is the user's message and it's been read
        if (isOwn && messageData.read) {
            // Check if it's a short message for indicator positioning
            const isShort = messageData.text && messageData.text.length < 30;
            addReadIndicator(messageBubble, textSpan, isShort);
        }
        
        // Add to messages container (prepend for historical messages, append for new ones)
        if (prepend) {
            messagesContainer.prepend(messageElement);
        } else {
            messagesContainer.appendChild(messageElement);
            if (animate) {
                // Add entry animation
                messageElement.style.animationName = 'messageAppear';
                messageElement.style.animationDuration = '0.3s';
            }
            
            // Scroll to bottom
            scrollToBottom(true);
        }
        
        // Add reactions if present - do this after adding to DOM for positioning
        if (messageData.reactions && messageData.reactions.length > 0) {
            console.log('Adding reactions to message:', messageId, messageData.reactions);
            updateReactions(messageBubble, messageData.reactions);
        }
        
        // Add timestamp AFTER reactions so it appears at the bottom
        messageBubble.appendChild(timestamp);
        
        return messageElement;
    }
    
    // Listen for message reaction updates
    socket.on('private message reaction update', function(data) {
        console.log('Received reaction update:', data);
        
        if (!data || !data.messageId || !data.reactions) {
            console.error('Invalid reaction update data:', data);
            return;
        }
        
        // Give a small delay to ensure DOM is ready
        setTimeout(() => {
            // First try to find the exact message element
            let messageElement = document.querySelector(`.message[data-message-id="${data.messageId}"]`);
            
            // If not found, try with the message bubble
            if (!messageElement) {
                messageElement = document.querySelector(`.message-bubble[data-message-id="${data.messageId}"]`);
            }
            
            // If still not found, fall back to any element with that message ID
            if (!messageElement) {
                const elements = document.querySelectorAll(`[data-message-id="${data.messageId}"]`);
                if (elements.length > 0) {
                    // Try to find the most appropriate container
                    for (const el of elements) {
                        if (el.classList.contains('message') || el.classList.contains('message-bubble')) {
                            messageElement = el;
                            break;
                        }
                    }
                    
                    // If still no match, use the first element
                    if (!messageElement && elements.length > 0) {
                        messageElement = elements[0];
                    }
                }
            }
            
            if (!messageElement) {
                console.error('Message element not found for reaction update:', data.messageId);
                return;
            }
            
            console.log('Found message element for reaction update:', messageElement);
            
            // Store updated reactions data
            messageElement.dataset.reactions = JSON.stringify(data.reactions);
            
            // Update the reactions
            updateReactions(messageElement, data.reactions);
            
            // Make sure any user interface is updated (like unread counts, etc.)
            const reactingUser = data.reactingUser;
            const isCurrentUserReaction = reactingUser === username;
            
            // If it's not the current user reacting, play a notification sound
            if (!isCurrentUserReaction && notificationSound) {
                notificationSound.play().catch(err => console.log('Could not play notification sound', err));
            }
        }, 50); // Small delay to ensure DOM is ready
    });

    // Fix scrollToOriginalMessage function with improved element finding
    function scrollToOriginalMessage(messageId) {
        if (!messageId) {
            console.error('No messageId provided to scroll to');
            return;
        }
        
        console.log('Attempting to scroll to original message:', messageId);
        
        // First, ensure we're using the right container reference
        const container = document.getElementById('messages') || messagesContainer;
        if (!container) {
            console.error('Messages container not found');
            return;
        }
        
        // Try each selector individually to find the message 
        let originalMessage = null;
        
        // Check all possible ways the message could be stored
        const selectors = [
            `.message[data-message-id="${messageId}"]`,
            `.message-wrapper[data-message-id="${messageId}"]`,
            `.message-container[data-message-id="${messageId}"]`,
            `[data-message-id="${messageId}"]`
        ];
        
        // Try each selector until we find the message
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`Found message with selector: ${selector}`);
                originalMessage = element;
                break;
            }
        }
        
        // If still not found, list all message IDs for debugging
        if (!originalMessage) {
            console.error('Original message not found:', messageId);
            
            // Debug: list all message elements to see what's available
            console.log('All message IDs in DOM:');
            document.querySelectorAll('[data-message-id]').forEach(el => {
                console.log(`ID: ${el.dataset.messageId}, Class: ${el.className}`);
            });
            
            if (typeof notifications !== 'undefined') {
                notifications.info('Original Message', 'Original message not found. It may have been deleted or is not loaded in the current view.');
            }
            return;
        }
        
        console.log('Found original message:', originalMessage);
        
        // Make sure originalMessage is a visible element
        // If we've found a wrapper, we need to scroll to a visible child
        if (originalMessage.classList.contains('message-wrapper')) {
            // Try to find a visible message element inside
            const visibleMsg = originalMessage.querySelector('.message');
            if (visibleMsg) {
                originalMessage = visibleMsg;
            }
        }
        
        // Get the position relative to the viewport
        const messageRect = originalMessage.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate the scroll position needed to center the message in view
        // This is more reliable than using offsetTop which can be affected by various layouts
        const scrollTop = container.scrollTop;
        const scrollPosition = scrollTop + (messageRect.top - containerRect.top) - (containerRect.height / 3);
        
        console.log('Scrolling to position:', scrollPosition);
        
        // Apply highlight animation
        originalMessage.classList.add('highlight-message');
        
        // Add a special indicator element
        const indicator = document.createElement('div');
        indicator.className = 'scroll-indicator original-message-indicator';
        indicator.innerHTML = '<i class="bi bi-arrow-right"></i> Original message';
        indicator.style.position = 'absolute';
        indicator.style.left = originalMessage.classList.contains('message-own') ? 'auto' : '0';
        indicator.style.right = originalMessage.classList.contains('message-own') ? '0' : 'auto';
        indicator.style.top = '-20px';
        indicator.style.background = 'rgba(242, 24, 217, 0.8)';
        indicator.style.color = '#fff';
        indicator.style.padding = '3px 8px';
        indicator.style.borderRadius = '10px';
        indicator.style.fontSize = '12px';
        indicator.style.zIndex = '10';
        indicator.style.pointerEvents = 'none';
        indicator.style.whiteSpace = 'nowrap';
        originalMessage.style.position = 'relative';
        originalMessage.appendChild(indicator);
        
        // Scroll to the message
        container.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
        });
        
        // Remove highlight and indicator after animation completes
        setTimeout(() => {
            originalMessage.classList.remove('highlight-message');
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 3000);
    }

    // Update the message display function to add reply click behavior
    function displayMessage(msg, isCurrentUser, shouldScroll = true) {
        const messagesList = document.getElementById('messages-list');
        const messagesContainer = document.getElementById('messages-container');

        const messageWrapper = document.createElement('div');
        messageWrapper.className = `message-wrapper ${isCurrentUser ? 'current-user' : ''}`;
        messageWrapper.dataset.messageId = msg._id;

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        // Check if this is a reply message
        if (msg.replyTo && msg.replyTo.messageId) {
            const replyInfo = document.createElement('div');
            replyInfo.className = 'reply-info';
            
            // Add click event to scroll to original message
            replyInfo.addEventListener('click', () => {
                scrollToOriginalMessage(msg.replyTo.messageId);
            });

            const replyUsername = document.createElement('span');
            replyUsername.className = 'reply-username';
            replyUsername.textContent = msg.replyTo.username;

            const replyText = document.createElement('span');
            replyText.className = 'reply-text';
            replyText.textContent = msg.replyTo.text;

            replyInfo.appendChild(replyUsername);
            replyInfo.appendChild(replyText);
            messageContent.appendChild(replyInfo);
        }

        // ... rest of the function stays the same ...
    }

    // Function to clear temporary media after sending
    function clearTempMedia() {
        tempMedia = null;
    }

    // Create the reaction menu globally at initialization
    function createReactionMenu() {
        // Remove any existing reaction menu
        if (document.querySelector('#reaction-menu')) {
            document.querySelector('#reaction-menu').remove();
        }
        
        // Create the reaction menu
        reactionMenu = document.createElement('div');
        reactionMenu.id = 'reaction-menu';
        reactionMenu.className = 'reaction-menu';
        
        // Create emoji list container
        const emojiList = document.createElement('div');
        emojiList.className = 'reaction-emoji-list';
        
        // Popular emojis - can customize this list
        const popularpEmojis = ['👍', '❤️', '😂', '😊', '🎉', '👏', '🔥', '😮'];
        
        // Add emoji buttons to the list
        popularpEmojis.forEach(emoji => {
            const emojiButton = document.createElement('span');
            emojiButton.className = 'reaction-emoji';
            emojiButton.textContent = emoji;
            emojiButton.dataset.emoji = emoji;
            emojiList.appendChild(emojiButton);
        });
        
        // Add emoji list to menu
        reactionMenu.appendChild(emojiList);
        
        // Add menu to document body
        document.body.appendChild(reactionMenu);
        
        // Add event listeners to reaction emojis
        reactionMenu.querySelectorAll('.reaction-emoji').forEach(emoji => {
            emoji.addEventListener('click', function(e) {
                e.stopPropagation();
                const messageId = reactionMenu.dataset.messageId;
                const conversationWith = reactionMenu.dataset.conversationWith;
                const emojiValue = this.dataset.emoji;
                
                // Verify messageId and conversationWith are not undefined
                if (!messageId || !conversationWith) {
                    console.error("Cannot send reaction: missing data", { messageId, conversationWith });
                    if (typeof notifications !== 'undefined') {
                        notifications.error('Error', 'Cannot react to this message');
                    }
                    closeReactionMenu();
                    return;
                }
                
                console.log("Sending reaction for private message ID:", messageId);
                
                // Find the message element
                const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
                if (!messageElement) {
                    console.error("Message element not found for immediate reaction update");
                } else {
                    // Get current reactions if the message exists
                    let currentReactions = [];
                    
                    // Attempt to get existing reactions from dataset
                    if (messageElement.dataset.reactions) {
                        try {
                            currentReactions = JSON.parse(messageElement.dataset.reactions);
                        } catch (e) {
                            console.error("Error parsing existing reactions:", e);
                            currentReactions = [];
                        }
                    }
                    
                    // Toggle reaction: remove if exists, add if not
                    const existingIndex = currentReactions.findIndex(r => 
                        r.emoji === emojiValue && r.username === username
                    );
                    
                    if (existingIndex >= 0) {
                        // Remove existing reaction
                        currentReactions.splice(existingIndex, 1);
                    } else {
                        // Add new reaction
                        currentReactions.push({
                            emoji: emojiValue,
                            username: username,
                            timestamp: new Date()
                        });
                    }
                    
                    // Store updated reactions
                    messageElement.dataset.reactions = JSON.stringify(currentReactions);
                    
                    // Immediately update the UI
                    updateReactions(messageElement, currentReactions);
                }
                
                // Send the reaction to the server
                socket.emit('private message reaction', {
                    messageId: messageId,
                    conversationWith: conversationWith,
                    emoji: emojiValue
                });
                
                // Close the menu
                closeReactionMenu();
            });
        });
        
        console.log('Reaction menu created and added to document body');
        
        return reactionMenu;
    }
    
    // Initialize the reaction menu on page load
    createReactionMenu();

    // Add CSS styles for reaction menu
    function addReactionStyles() {
        // Remove any existing styles
        const existingStyle = document.getElementById('reaction-menu-styles');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // Create style element
        const styleElement = document.createElement('style');
        styleElement.id = 'reaction-menu-styles';
        styleElement.textContent = `
            /* WhatsApp-style reactions */
            .message-reactions {
                display: flex;
                margin: 2px 0 0 0;
                padding: 0;
                gap: 4px;
                justify-content: flex-start;
                align-items: center;
                flex-wrap: wrap;
            }
            
            /* Make bubbles consistent for all users */
            .message-bubble {
                border-radius: 12px;
                background-color: rgba(255, 255, 255, 0.2) !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                color: white;
                max-width: 70%;
                word-break: break-word;
                position: relative;
                padding: 8px 12px;
                margin: 2px 0;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }
            
            .message-bubble.own {
                background-color: rgba(255, 255, 255, 0.2) !important;
                color: white;
            }
            
            .message-bubble.other {
                background-color: rgba(255, 255, 255, 0.15) !important;
                color: white;
            }
            
            /* Reaction badges with a subtle design */
            .reaction-badge {
                display: inline-flex;
                align-items: center;
                background-color: rgba(42, 48, 60, 0.9);
                border-radius: 14px;
                padding: 2px 6px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.15s;
                border: 1px solid rgba(70, 70, 90, 0.3);
                margin: 0;
            }
            
            .reaction-badge:hover {
                background-color: rgba(60, 66, 80, 0.9);
                border-color: rgba(242, 24, 217, 0.4);
            }
            
            .reaction-badge.user-reacted {
                background-color: rgba(242, 24, 217, 0.15);
                border-color: rgba(242, 24, 217, 0.3);
            }
            
            .reaction-count {
                margin-left: 3px;
                font-size: 10px;
                color: rgba(255, 255, 255, 0.8);
                background: rgba(60, 66, 80, 0.7);
                border-radius: 8px;
                padding: 1px 4px;
                min-width: 14px;
                text-align: center;
            }
            
            /* Reaction menu styling */
            #reaction-menu {
                display: none;
                position: fixed;
                background-color: rgba(30, 30, 40, 0.95);
                border-radius: 20px;
                padding: 4px 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                border: 1px solid rgba(242, 24, 217, 0.3);
            }
            
            .reaction-emoji-list {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 2px;
            }
            
            .reaction-emoji {
                font-size: 18px;
                padding: 5px;
                width: 30px;
                height: 30px;
            }
            
            .reaction-emoji:hover {
                background-color: rgba(242, 24, 217, 0.4);
                transform: scale(1.2);
            }
            
            /* Make sure reaction actions are visible */
            .message-bubble .message-actions {
                visibility: hidden;
                opacity: 0;
                transition: all 0.2s;
            }
            
            .message-bubble:hover .message-actions {
                visibility: visible;
                opacity: 1;
            }
        `;
        
        document.head.appendChild(styleElement);
        console.log('Added reaction styles to document head');
    }
    
    // Initialize styles when page loads
    addReactionStyles();

    // Add styles for highlighting and reply info
    function addHighlightAndReplyStyles() {
        // Check if styles already exist
        const existingStyle = document.getElementById('highlight-reply-styles');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // Create style element
        const styleElement = document.createElement('style');
        styleElement.id = 'highlight-reply-styles';
        styleElement.textContent = `
            /* Message highlight animation */
            @keyframes highlightPulse {
                0% { background-color: rgba(242, 24, 217, 0); }
                25% { background-color: rgba(242, 24, 217, 0.3); }
                50% { background-color: rgba(242, 24, 217, 0.2); }
                75% { background-color: rgba(242, 24, 217, 0.15); }
                100% { background-color: rgba(242, 24, 217, 0); }
            }
            
            .highlight-message {
                animation: highlightPulse 2s ease;
                border-radius: 8px;
            }
            
            /* Style for reply info */
            .reply-info {
                display: flex;
                align-items: center;
                background-color: rgba(30, 30, 40, 0.8);
                border-left: 3px solid #f218d9;
                padding: 5px 8px;
                margin-bottom: 4px;
                border-radius: 4px;
                font-size: 0.85em;
                max-width: 95%;
                cursor: pointer;
            }
            
            .reply-info:hover {
                background-color: rgba(242, 24, 217, 0.2);
            }
            
            .reply-avatar {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                margin-right: 5px;
                display: inline-block;
            }
            
            .reply-username {
                color: #f218d9;
                font-weight: bold;
                margin-right: 5px;
            }
            
            .reply-text {
                color: rgba(255, 255, 255, 0.7);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 200px;
            }
        `;
        
        document.head.appendChild(styleElement);
        console.log('Added highlight and reply styles to document head');
    }
    
    // Initialize styles when page loads
    addReactionStyles();
    addHighlightAndReplyStyles();

    // Create and inject a custom CSS stylesheet with !important to override existing styles
    function injectCustomStyles() {
        console.log('Injecting custom styles with !important flags');
        
        // Remove existing style element if it exists
        const existingStyle = document.getElementById('custom-override-styles');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // Create a new style element
        const styleElement = document.createElement('style');
        styleElement.id = 'custom-override-styles';
        
        // Set the CSS content with !important flags
        styleElement.textContent = `
            /* Make message bubbles translucent */
            .message-bubble, 
            .message-bubble.own, 
            .message-bubble.other,
            .message-own,
            .message-other,
            .message {
                background-color: rgba(255, 255, 255, 0.2) !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                color: white !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 12px !important;
                flex-direction: column !important;
                display: flex !important;
                position: relative !important;
            }
            
            /* Make sure message text appears first in the bubble */
            .message-text {
                order: 1 !important;
                margin-bottom: 5px !important;
                width: 100% !important;
                position: relative !important;
            }
            
            /* Position reactions AFTER the message text */
            .message-reactions {
                order: 2 !important; 
                display: flex !important;
                flex-direction: row !important;
                justify-content: flex-start !important;
                align-items: center !important;
                flex-wrap: wrap !important;
                width: 100% !important;
                margin: 4px 0 2px 0 !important;
                padding: 0 !important;
                gap: 4px !important;
            }
            
            /* Place timestamp at the end */
            .message-time {
                order: 3 !important;
                margin-top: 2px !important;
                align-self: flex-end !important;
            }
            
            /* Style reaction badges */
            .reaction-badge {
                display: inline-flex !important;
                align-items: center !important;
                background-color: rgba(30, 30, 30, 0.8) !important;
                border-radius: 14px !important;
                padding: 2px 6px !important;
                font-size: 12px !important;
                cursor: pointer !important;
                transition: all 0.15s !important;
                border: 1px solid rgba(60, 60, 80, 0.3) !important;
                margin-right: 4px !important;
                margin-top: 2px !important;
            }
            
            /* Fix read indicator positioning */
            .read-indicator {
                position: absolute !important;
                bottom: 0 !important;
                right: 4px !important;
                z-index: 10 !important;
                font-size: 12px !important;
                color: rgba(255, 255, 255, 0.7) !important;
            }
            
            /* For the after-message style read indicators */
            .read-indicator.after-message {
                position: relative !important;
                bottom: auto !important;
                right: auto !important;
                margin-left: 4px !important;
                display: inline-flex !important;
                align-items: center !important;
            }
            
            /* Make sure the read-wrapper doesn't interfere with message layout */
            .read-wrapper {
                display: inline-flex !important;
                align-items: center !important;
                order: 1 !important; /* Same order as message text */
                position: relative !important;
                margin-left: 5px !important;
            }
            
            /* Make sure message actions stay on top */
            .message-actions {
                position: absolute !important;
                top: 0 !important;
                right: 0 !important;
                z-index: 20 !important;
            }
        `;
        
        // Add the style element to the document head
        document.head.appendChild(styleElement);
        console.log('Custom styles injected');
    }
    
    // Call the function to inject styles when the page loads
    window.addEventListener('DOMContentLoaded', function() {
        setTimeout(injectCustomStyles, 500); // Delay to ensure it overrides other styles
    });
    
    // Also inject when new messages arrive
    socket.on('private message', function() {
        injectCustomStyles();
    });
    
    // Also inject when we open a conversation
    const originalOpenConversation = openConversation;
    openConversation = function(withUsername) {
        originalOpenConversation(withUsername);
        setTimeout(injectCustomStyles, 1000);
    };

    // Call the injector immediately
    injectCustomStyles();
    
    // Add a MutationObserver to detect DOM changes and reapply styles
    const observer = new MutationObserver(function(mutations) {
        console.log('DOM changes detected, reapplying styles');
        injectCustomStyles();
    });
    
    // Start observing once DOM is loaded
    window.addEventListener('load', function() {
        // Observe the messages container for changes
        if (messagesContainer) {
            observer.observe(messagesContainer, { 
                childList: true, 
                subtree: true,
                attributes: true,
                characterData: true
            });
            console.log('MutationObserver started on messages container');
        }
        
        // Force another style injection after a short delay
        setTimeout(injectCustomStyles, 1000);
        setTimeout(injectCustomStyles, 2000);
        setTimeout(injectCustomStyles, 5000);
    });

    // Make updateReactions globally available for other scripts
    window.updateReactions = updateReactions;
}); 