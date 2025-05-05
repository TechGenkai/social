// Function to check if user is logged in
function isLoggedIn() {
    // Check for login status in localStorage (or sessionStorage)
    return localStorage.getItem('isLoggedIn') === 'true';
}

// Check if registration is pending
function isRegistrationPending() {
    return localStorage.getItem('registrationPending') === 'true';
}

// Redirect if not logged in or if registration is pending but not on registration page
function checkLoginStatus() {
    // If we're not on the login or signup page and user is not logged in, redirect to login
    const currentPage = window.location.pathname;
    const isLoginPage = currentPage === '/login' || currentPage === '/signup' || currentPage === '/register';
    const isAccountSwitchPage = currentPage === '/account-switch';
    
    // First check if logged in
    if (!isLoginPage && !isAccountSwitchPage && !isLoggedIn()) {
        // Force redirect to login page
        window.location.replace('/login');
        return false;
    }
    
    // Then check if registration is pending but we're not on registration page
    if (isLoggedIn() && isRegistrationPending() && currentPage !== '/register') {
        // Force redirect to registration page
        window.location.replace('/register');
        return false;
    }
    
    return true;
}

// Set login status (call this after successful login)
function setLoginStatus(status) {
    localStorage.setItem('isLoggedIn', status);
    
    // If logging in, initialize account management
    if (status === 'true') {
        initializeAccountStorage();
    }
}

// Initialize account storage for first login or when active accounts don't exist
function initializeAccountStorage() {
    // Check if active accounts exist
    const activeAccountsJSON = localStorage.getItem('activeAccounts');
    
    // If no active accounts exist, create storage with current user
    if (!activeAccountsJSON) {
        const username = localStorage.getItem('username');
        const displayName = localStorage.getItem('displayName') || 'Unknown User';
        const profilePic = localStorage.getItem('profilePic') || '/images/default-profile.png';
        
        if (username) {
            const currentAccount = {
                username,
                displayName,
                profilePic,
                lastActive: Date.now()
            };
            
            localStorage.setItem('activeAccounts', JSON.stringify([currentAccount]));
        }
    } else {
        // If active accounts exist, check if current user is in the list
        const activeAccounts = JSON.parse(activeAccountsJSON);
        const username = localStorage.getItem('username');
        
        if (username) {
            const exists = activeAccounts.some(account => account.username === username);
            
            if (!exists) {
                // Add current user to active accounts
                const currentAccount = {
                    username,
                    displayName: localStorage.getItem('displayName') || 'Unknown User',
                    profilePic: localStorage.getItem('profilePic') || '/images/default-profile.png',
                    lastActive: Date.now()
                };
                
                activeAccounts.push(currentAccount);
                localStorage.setItem('activeAccounts', JSON.stringify(activeAccounts));
            }
        }
    }
}

// Set active page in sidebar
function setActivePage() {
    try {
        // Get current path
        const currentPath = window.location.pathname;
        
        // Log the current path for debugging
        console.log('Current path:', currentPath);
        
        // Find all navigation elements that could be highlighted
        let sidebarLinks = [];
        let navbarIcons = [];
        
        // Try to find sidebar links using various selectors
        const sidebarSelectors = [
            '.sidebar a',
            'nav a',
            '.nav a',
            '#sidebar a',
            'aside a',
            '[class*="sidebar"] a',
            '[class*="nav"] a'
        ];
        
        // Try each selector until we find some links
        for (const selector of sidebarSelectors) {
            try {
                const links = document.querySelectorAll(selector);
                if (links && links.length > 0) {
                    sidebarLinks = Array.from(links);
                    console.log(`Found ${links.length} sidebar links using selector: ${selector}`);
                    break;
                }
            } catch (err) {
                console.warn(`Error with selector ${selector}:`, err);
            }
        }
        
        // Try to find navbar icons using various selectors
        const navbarSelectors = [
            '.nav-icons a',
            'header a', 
            'nav:first-of-type a',
            '.navbar a',
            '[class*="header"] a',
            '[class*="topbar"] a'
        ];
        
        // Try each selector until we find some icons
        for (const selector of navbarSelectors) {
            try {
                const icons = document.querySelectorAll(selector);
                if (icons && icons.length > 0) {
                    navbarIcons = Array.from(icons);
                    console.log(`Found ${icons.length} navbar icons using selector: ${selector}`);
                    break;
                }
            } catch (err) {
                console.warn(`Error with selector ${selector}:`, err);
            }
        }
        
        // Direct handling for specific pages
        if (currentPath === '/messages' || currentPath.startsWith('/messages/')) {
            console.log('Messages page detected, setting active class directly');
            
            // Clear any existing active classes
            document.querySelectorAll('a.active').forEach(a => {
                a.classList.remove('active');
            });
            
            // Find and highlight the messages link in sidebar
            const messagesLink = document.querySelector('.sidebar a[href="/messages"]');
            if (messagesLink) {
                messagesLink.classList.add('active');
                console.log('Added active class to messages link:', messagesLink);
                return;
            }
            
            // Fallback to finding by content
            const messageLinks = Array.from(document.querySelectorAll('.sidebar a')).filter(a => {
                const text = a.textContent?.trim();
                const img = a.querySelector('img');
                const alt = img ? img.getAttribute('alt') : '';
                const containsMessages = text === 'Messages' || text?.includes('Messages') || 
                                        alt === 'Messages' || alt?.includes('Messages');
                return containsMessages;
            });
            
            if (messageLinks.length > 0) {
                messageLinks[0].classList.add('active');
                console.log('Added active class to messages link by content:', messageLinks[0]);
                return;
            }
        }
        
        // Remove active class from all links before adding it to the matching one
        sidebarLinks.forEach(link => {
            if (link && link.classList) link.classList.remove('active');
        });
        navbarIcons.forEach(icon => {
            if (icon && icon.classList) icon.classList.remove('active');
        });
        
        // Function to check if a link matches the current path
        const matchesPath = (link, path) => {
            if (!link) return false;
            
            try {
                const href = link.getAttribute('href');
                if (!href) return false;
                
                // Log the href for debugging
                console.log(`Checking link: ${href} against path: ${path}`);
                
                // Check for exact match
                if (href === path) return true;
                
                // Check for home page special case
                if ((href === '/' || href === '/index.html') && 
                    (path === '/' || path === '/index.html')) {
                    return true;
                }
                
                // Check for path prefix match for non-home pages
                if (href !== '/' && path.startsWith(href)) return true;
                
                // Special case for messages
                if ((href === '/messages' || href.includes('messages')) && 
                    (path.includes('messages') || path.includes('private-messages'))) {
                    return true;
                }
                
                // Special case for profile
                if ((href === '/profile' || href.includes('profile')) && 
                    (path.includes('profile') || path.includes('user-profile'))) {
                    return true;
                }
                
                return false;
            } catch (err) {
                console.warn('Error matching path for link:', err);
                return false;
            }
        };
        
        // Try to match sidebar links
        let foundSidebarMatch = false;
        for (const link of sidebarLinks) {
            if (matchesPath(link, currentPath)) {
                try {
                    if (link.classList) {
                        link.classList.add('active');
                        console.log('Added active class to sidebar link:', link);
                        foundSidebarMatch = true;
                        break;
                    }
                } catch (err) {
                    console.warn('Error adding active class to sidebar link:', err);
                }
            }
        }
        
        // Try to match navbar icons
        let foundNavbarMatch = false;
        for (const icon of navbarIcons) {
            if (matchesPath(icon, currentPath)) {
                try {
                    if (icon.classList) {
                        icon.classList.add('active');
                        console.log('Added active class to navbar icon:', icon);
                        foundNavbarMatch = true;
                        break;
                    }
                } catch (err) {
                    console.warn('Error adding active class to navbar icon:', err);
                }
            }
        }
        
    } catch (error) {
        console.error('Error in setActivePage:', error);
    }
}

// Function to update unread message badges in navbar and sidebar for all pages
function updateGlobalUnreadBadges() {
    // Get the unread count from localStorage, set by private-messages.js
    const unreadCount = parseInt(localStorage.getItem('unreadMessageCount')) || 0;
    
    if (unreadCount > 0) {
        console.log('Updating global unread badges:', unreadCount);
        
        // No longer adding badge to navbar message icon
        
        // Find the message link in sidebar
        const sidebarMessageIcon = document.querySelector('.sidebar a[title="Messages"]') || 
                                document.querySelector('.sidebar a[href="/messages"]');
        
        if (sidebarMessageIcon) {
            // Remove existing badge if present
            const existingBadge = sidebarMessageIcon.querySelector('.message-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Create and add the badge
            const badge = document.createElement('div');
            badge.className = 'message-badge';
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            sidebarMessageIcon.style.position = 'relative';
            sidebarMessageIcon.appendChild(badge);
        }
    }
}

// Initialize search functionality
function initializeSearch() {
    const searchBar = document.querySelector('.search-bar input');
    if (!searchBar) return;
    
    // Create a dropdown container for search results
    const searchResults = document.createElement('div');
    searchResults.className = 'search-results';
    searchResults.style.display = 'none';
    document.querySelector('.search-bar').appendChild(searchResults);
    
    // Add event listener for the search bar
    let debounceTimeout;
    searchBar.addEventListener('input', function() {
        // Clear previous timeout
        clearTimeout(debounceTimeout);
        const query = this.value.trim();
        
        // Hide results if query is too short
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        // Set shorter debounce time for faster response
        debounceTimeout = setTimeout(() => {
            searchUsers(query);
        }, 200); // Reduced from 300ms to 200ms
    });
    
    // Also trigger search on focus if there's content
    searchBar.addEventListener('focus', function() {
        const query = this.value.trim();
        if (query.length >= 2) {
            searchUsers(query);
        }
    });
    
    // Hide search results when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.search-bar')) {
            searchResults.style.display = 'none';
        }
    });
    
    // Function to search for users
    async function searchUsers(query) {
        try {
            const username = localStorage.getItem('username');
            if (!username) return;
            
            // Show loading indicator
            searchResults.innerHTML = '<div class="no-results">Searching...</div>';
            searchResults.style.display = 'block';
            
            const response = await fetch(`/api/search/users?q=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-username': username
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            displaySearchResults(data.users);
        } catch (error) {
            console.error('Error searching for users:', error);
            searchResults.innerHTML = '<div class="no-results">Error searching</div>';
            searchResults.style.display = 'block';
        }
    }
    
    // Function to display search results
    function displaySearchResults(users) {
        searchResults.innerHTML = '';
        
        if (users.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No users found</div>';
            searchResults.style.display = 'block';
            return;
        }
        
        users.forEach(user => {
            const userItem = document.createElement('a');
            userItem.className = 'search-result-item';
            userItem.href = user.isCurrentUser ? '/profile' : `/user/${user.username}`;
            
            const userImg = document.createElement('img');
            userImg.src = user.profilePic;
            userImg.alt = user.displayName;
            userImg.className = 'search-result-img';
            
            const userInfo = document.createElement('div');
            userInfo.className = 'search-result-info';
            
            const displayName = document.createElement('div');
            displayName.className = 'search-result-name';
            displayName.textContent = user.displayName;
            
            const username = document.createElement('div');
            username.className = 'search-result-username';
            username.textContent = '@' + user.username;
            
            userInfo.appendChild(displayName);
            userInfo.appendChild(username);
            
            userItem.appendChild(userImg);
            userItem.appendChild(userInfo);
            
            searchResults.appendChild(userItem);
        });
        
        searchResults.style.display = 'block';
    }
}

// Setup headers for API requests
function setupHeaders() {
    // Add authorization headers to all fetch requests
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        // Create headers if they don't exist
        if (!options.headers) {
            options.headers = {};
        }
        
        // Add current user to headers if logged in
        const username = localStorage.getItem('username');
        if (username) {
            options.headers['x-username'] = username;
        }
        
        // Add registration pending flag if applicable
        if (isRegistrationPending()) {
            options.headers['x-registration-pending'] = 'true';
        }
        
        return originalFetch(url, options);
    };
}

// Function to initialize global Socket.io connection for online status tracking
function initializeGlobalSocket() {
    // Skip if we're on login/registration pages
    const currentPath = window.location.pathname;
    const isAuthPage = ['/login', '/signup', '/register', '/account-switch'].includes(currentPath);
    if (isAuthPage) return;
    
    const username = localStorage.getItem('username');
    if (!username) return;
    
    console.log('Initializing global Socket.io connection for online status');
    
    // Check if socket already exists (might be initialized by another page)
    if (window.globalSocket) return;
    
    try {
        // Connect to Socket.io with authentication
        window.globalSocket = io({
            auth: {
                username: username
            },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity
        });
        
        // Set up event handlers
        window.globalSocket.on('connect', () => {
            console.log('Global socket connected');
        });
        
        window.globalSocket.on('connect_error', (err) => {
            console.error('Global socket connection error:', err.message);
        });
        
        // Listen for online status updates from other users
        window.globalSocket.on('user status', (data) => {
            console.log(`User status update: ${data.username} is ${data.status}`);
            // Dispatch a custom event so other components can listen for it
            document.dispatchEvent(new CustomEvent('user-status-update', { 
                detail: { 
                    username: data.username, 
                    status: data.status 
                } 
            }));
            
            // Update UI elements with this user's status
            updateUserStatusUI(data.username, data.status);
        });
        
        // Listen for initial list of online users
        window.globalSocket.on('online users', (usersList) => {
            console.log('Received online users list:', usersList);
            // Store in sessionStorage for reference
            sessionStorage.setItem('onlineUsers', JSON.stringify(usersList));
            
            // Dispatch a custom event so other components can listen for it
            document.dispatchEvent(new CustomEvent('online-users-update', { 
                detail: { users: usersList } 
            }));
        });
        
        // Start sending heartbeats every minute to keep online status
        setInterval(() => {
            if (window.globalSocket && window.globalSocket.connected) {
                window.globalSocket.emit('heartbeat');
                console.log('Sent heartbeat to maintain online status');
            }
        }, 60 * 1000); // every minute
    } catch (err) {
        console.error('Error initializing global socket:', err);
    }
}

// Function to update UI elements based on user status changes
function updateUserStatusUI(username, status) {
    // Update status indicators in the friends list
    const friendCards = document.querySelectorAll(`.friend-card[data-username="${username}"]`);
    
    friendCards.forEach(card => {
        // Find the status indicator
        const statusIndicator = card.querySelector('.status-indicator');
        const lastSeenText = card.querySelector('.last-seen');
        
        if (statusIndicator) {
            // Update the indicator
            if (status === 'online') {
                statusIndicator.classList.remove('offline');
                statusIndicator.classList.add('online');
                statusIndicator.title = 'Online';
                
                // Remove last seen text if it exists
                if (lastSeenText) {
                    lastSeenText.style.display = 'none';
                }
            } else {
                statusIndicator.classList.remove('online');
                statusIndicator.classList.add('offline');
                statusIndicator.title = 'Offline';
                
                // We don't have the lastSeen info here, will need to refresh to get it
                // or implement a more sophisticated status update event
            }
        }
    });
    
    // If we're in a private message screen with this user, update their status
    const currentChatUser = document.querySelector('.chat-header .user-info h2')?.dataset?.username;
    if (currentChatUser === username) {
        const statusElement = document.querySelector('.chat-header .user-status');
        if (statusElement) {
            statusElement.classList.remove('online', 'offline');
            statusElement.classList.add(status);
            statusElement.textContent = status === 'online' ? 'Online' : 'Offline';
        }
    }
}

// Wait for DOM to be ready, then initialize
document.addEventListener('DOMContentLoaded', function() {
    // Only proceed if the user is logged in
    if (isLoggedIn()) {
        if (!isRegistrationPending()) {
            // Initialize search functionality
            initializeSearch();
            
            // Set up headers with user info
            setupHeaders();
            
            // Set active page in navigation
            setActivePage();
            
            // Update unread message badges
            updateGlobalUnreadBadges();
            
            // Initialize global Socket.io connection for online status tracking across all pages
            initializeGlobalSocket();
        }
    }
    
    // Initialize unread badge update periodically
    setInterval(updateGlobalUnreadBadges, 30000); // Check every 30 seconds
});

// Add event listener for page visibility changes (handles when user uses back button)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // Page is now visible again (after using back button)
        checkLoginStatus();
        // Update active page indicator when returning to the page
        setActivePage();
    }
}); 