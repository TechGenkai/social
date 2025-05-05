// Friends page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const username = localStorage.getItem('username');
    if (!username) {
        window.location.href = '/login';
        return;
    }

    // Initialize UI
    initializeTabs();
    
    // Check if we're viewing a specific user's friends
    const urlPath = window.location.pathname;
    const segments = urlPath.split('/');
    
    console.log('URL path:', urlPath);
    console.log('Path segments:', segments);
    
    if (segments.length > 2 && segments[1] === 'friends') {
        const targetUsername = segments[2];
        console.log('Loading friends for:', targetUsername);
        
        // Decode the username in case it contains special characters
        const decodedUsername = decodeURIComponent(targetUsername);
        loadUserFriends(decodedUsername);
        
        // Update page title and hide tabs/requests if viewing another user's friends
        if (decodedUsername !== username) {
            // Hide tabs and requests section
            const tabsContainer = document.querySelector('.tabs-container');
            if (tabsContainer) tabsContainer.style.display = 'none';
            
            const requestsSection = document.getElementById('pending-requests-content');
            if (requestsSection) requestsSection.style.display = 'none';
            
            // Update page title
            const friendsTitle = document.getElementById('friends-title');
            if (friendsTitle) friendsTitle.textContent = 'Friends';
            
            const pageTitle = document.getElementById('page-title');
            if (pageTitle) pageTitle.textContent = `${decodedUsername}'s Friends`;
        } else {
            // If it's the current user, load as normal
            loadFriends();
            loadFriendRequests();
        }
    } else {
        // Regular friends page
        loadFriends();
        loadFriendRequests();
    }

    // Initialize search functionality
    const searchInput = document.getElementById('friend-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            filterFriends(query);
        });
    }
    
    // Listen for user status updates
    document.addEventListener('user-status-update', function(event) {
        const { username: updatedUsername, status } = event.detail;
        
        // Find all friend cards with this username
        const friendCards = document.querySelectorAll(`.friend-card[data-username="${updatedUsername}"]`);
        if (friendCards.length === 0) return;
        
        friendCards.forEach(card => {
            const statusIndicator = card.querySelector('.status-indicator');
            const lastSeenText = card.querySelector('.last-seen');
            
            if (statusIndicator) {
                // Update the status indicator class
                statusIndicator.classList.remove('online', 'offline');
                statusIndicator.classList.add(status);
                statusIndicator.title = status === 'online' ? 'Online' : 'Offline';
                
                // Handle last seen text visibility
                if (lastSeenText) {
                    lastSeenText.style.display = status === 'online' ? 'none' : 'block';
                }
            }
        });
        
        // If status changed to online, we may need to reorder the friends list
        // The simplest approach is to reload the list
        if (status === 'online') {
            // Check if we're on the main friends page or viewing another user's friends
            const urlPath = window.location.pathname;
            const segments = urlPath.split('/');
            
            if (segments.length > 2 && segments[1] === 'friends') {
                // We're viewing another user's friends
                const targetUsername = decodeURIComponent(segments[2]);
                loadUserFriends(targetUsername);
            } else {
                // Regular friends page
                loadFriends();
            }
        }
    });
});

// Initialize tab functionality
function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab
            this.classList.add('active');

            // Show corresponding content
            const contentId = `${this.dataset.tab}-content`;
            document.getElementById(contentId).classList.add('active');
        });
    });
}

// Load a specific user's friends
async function loadUserFriends(targetUsername, page = 1) {
    try {
        console.log(`Fetching friends for user: ${targetUsername} (page ${page})`);
        const currentUsername = localStorage.getItem('username');
        
        const response = await fetch(`/api/friends/${encodeURIComponent(targetUsername)}?page=${page}&limit=24`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-username': currentUsername
            }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            console.error(`Error response: ${response.status} ${response.statusText}`);
            
            let errorMessage = 'Failed to load friends list';
            try {
                const errorData = await response.json();
                console.error('Error details:', errorData);
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                console.error('Could not parse error response as JSON');
            }
            
            if (response.status === 403) {
                notifications.error('Access Denied', 'You must be friends with this user to view their friends list');
                setTimeout(() => {
                    window.location.href = '/friends';
                }, 2000);
                return;
            } else if (response.status === 404) {
                notifications.error('User Not Found', 'This user does not exist');
                setTimeout(() => {
                    window.location.href = '/friends';
                }, 2000);
                return;
            }
            
            notifications.error('Error', errorMessage);
            return;
        }
        
        const data = await response.json();
        console.log('Friends data received:', data);
        
        // Update friend count
        const friendCount = document.getElementById('friend-count');
        if (friendCount) {
            friendCount.textContent = data.pagination ? data.pagination.total : (data.friends ? data.friends.length : 0);
        }
        
        // Update the UI with friends - use a different message for no friends
        renderFriendsList(data.friends, targetUsername !== currentUsername ? targetUsername : null, page > 1, data.pagination);
    } catch (error) {
        console.error('Error loading user friends:', error);
        notifications.error('Error', 'Failed to load friends list');
    }
}

// Load friends list
async function loadFriends(page = 1) {
    try {
        const username = localStorage.getItem('username');
        
        const response = await fetch(`/api/friends?page=${page}&limit=24`, {
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
        
        // Update friend count
        const friendCount = document.getElementById('friend-count');
        if (friendCount) {
            friendCount.textContent = data.pagination ? data.pagination.total : (data.friends ? data.friends.length : 0);
        }
        
        // Update the UI with friends
        renderFriendsList(data.friends, null, page > 1, data.pagination);
    } catch (error) {
        console.error('Error loading friends:', error);
        notifications.error('Error', 'Failed to load friends list');
    }
}

// Load friend requests
async function loadFriendRequests() {
    try {
        const username = localStorage.getItem('username');
        
        const response = await fetch('/api/friends/requests', {
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
        
        // Update request count
        const requestCount = document.getElementById('request-count');
        if (requestCount) {
            requestCount.textContent = data.requests ? data.requests.length : 0;
        }
        
        // Update the UI with friend requests
        renderFriendRequests(data.requests);
    } catch (error) {
        console.error('Error loading friend requests:', error);
        notifications.error('Error', 'Failed to load friend requests');
    }
}

// Format last seen date
function formatLastSeen(lastSeenDate) {
    if (!lastSeenDate) return '';
    
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

// Render friends list
function renderFriendsList(friends, otherUsername = null, isAppending = false, pagination = null) {
    const friendsListElement = document.getElementById('friendsList');
    
    if (!friendsListElement) {
        console.error('Friends list element not found');
        return;
    }
    
    // Clear current content if not appending
    if (!isAppending) {
        friendsListElement.innerHTML = '';
    } else {
        // Remove the load more button if it exists
        const existingLoadMore = friendsListElement.querySelector('.load-more-container');
        if (existingLoadMore) {
            existingLoadMore.remove();
        }
    }
    
    if (!friends || friends.length === 0) {
        if (!isAppending) {
            const noFriendsElement = document.createElement('div');
            noFriendsElement.className = 'no-friends';
            
            if (otherUsername) {
                noFriendsElement.textContent = `${otherUsername} doesn't have any friends yet`;
            } else {
                noFriendsElement.textContent = "You haven't added any friends yet";
            }
            
            friendsListElement.appendChild(noFriendsElement);
        }
        return;
    }
    
    // Render each friend
    friends.forEach(friend => {
        const friendCard = document.createElement('div');
        friendCard.className = 'friend-card';
        friendCard.dataset.username = friend.username;
        
        // Create online status indicator
        const statusIndicator = friend.isOnline 
            ? '<span class="status-indicator online" title="Online"></span>' 
            : '<span class="status-indicator offline" title="Offline"></span>';
        
        // Create last seen text for offline users
        const lastSeenText = !friend.isOnline && friend.lastSeen 
            ? `<p class="last-seen">Last seen: ${formatLastSeen(friend.lastSeen)}</p>`
            : '';
        
        friendCard.innerHTML = `
            <div class="friend-avatar">
                <img src="${friend.profilePic || '/images/default-profile.png'}" alt="${friend.displayName}">
                ${statusIndicator}
            </div>
            <div class="friend-info">
                <h3>${friend.displayName}</h3>
                <p>@${friend.username}</p>
                ${lastSeenText}
                <div class="friend-actions">
                    <button class="friend-btn message-btn" data-username="${friend.username}">Message</button>
                    <button class="friend-btn view-btn" data-username="${friend.username}">View Profile</button>
                </div>
            </div>
        `;
        
        friendsListElement.appendChild(friendCard);
        
        // Add event listeners
        const messageBtn = friendCard.querySelector('.message-btn');
        const viewBtn = friendCard.querySelector('.view-btn');
        
        if (messageBtn) {
            messageBtn.addEventListener('click', function() {
                window.location.href = `/messages/${friend.username}`;
            });
        }
        
        if (viewBtn) {
            viewBtn.addEventListener('click', function() {
                window.location.href = `/user/${friend.username}`;
            });
        }
    });
    
    // Add "Load More" button if there are more pages
    if (pagination && pagination.page < pagination.pages) {
        const loadMoreContainer = document.createElement('div');
        loadMoreContainer.className = 'load-more-container';
        loadMoreContainer.style.width = '100%';
        loadMoreContainer.style.textAlign = 'center';
        loadMoreContainer.style.marginTop = '1rem';
        
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'action-btn';
        loadMoreBtn.textContent = 'Load More';
        loadMoreBtn.addEventListener('click', () => {
            const nextPage = pagination.page + 1;
            if (otherUsername) {
                loadUserFriends(otherUsername, nextPage);
            } else {
                loadFriends(nextPage);
            }
        });
        
        loadMoreContainer.appendChild(loadMoreBtn);
        friendsListElement.appendChild(loadMoreContainer);
    }
}

// Render friend requests
function renderFriendRequests(requests) {
    const requestsElement = document.getElementById('friendRequests');
    
    if (!requestsElement) {
        console.error('Friend requests element not found');
        return;
    }
    
    // Clear current content
    requestsElement.innerHTML = '';
    
    if (!requests || requests.length === 0) {
        const noRequestsElement = document.createElement('div');
        noRequestsElement.className = 'no-requests';
        noRequestsElement.textContent = 'No pending friend requests';
        requestsElement.appendChild(noRequestsElement);
        return;
    }
    
    // Render each request
    requests.forEach(request => {
        const requestCard = document.createElement('div');
        requestCard.className = 'request-card';
        requestCard.dataset.username = request.username;
        
        requestCard.innerHTML = `
            <img src="${request.profilePic || '/images/default-profile.png'}" alt="${request.displayName}">
            <div class="request-info">
                <h3>${request.displayName}</h3>
                <p>@${request.username}</p>
                <div class="request-actions">
                    <button class="request-btn accept-btn" data-id="${request.requestId}">Accept</button>
                    <button class="request-btn reject-btn" data-id="${request.requestId}">Reject</button>
                </div>
            </div>
        `;
        
        requestsElement.appendChild(requestCard);
        
        // Add event listeners
        const acceptBtn = requestCard.querySelector('.accept-btn');
        const rejectBtn = requestCard.querySelector('.reject-btn');
        
        if (acceptBtn) {
            acceptBtn.addEventListener('click', function() {
                handleFriendRequest(request.requestId, 'accept');
            });
        }
        
        if (rejectBtn) {
            rejectBtn.addEventListener('click', function() {
                handleFriendRequest(request.requestId, 'reject');
            });
        }
    });
}

// Handle friend request response
async function handleFriendRequest(requestId, action) {
    try {
        const username = localStorage.getItem('username');
        
        const response = await fetch(`/api/friends/requests/${requestId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-username': username
            },
            body: JSON.stringify({ action })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Show success notification
            notifications.success(
                action === 'accept' ? 'Friend Added' : 'Request Rejected',
                data.message
            );
            
            // Reload friend requests and friends
            loadFriendRequests();
            if (action === 'accept') {
                loadFriends();
            }
        } else {
            notifications.error('Error', data.message || 'Failed to process request');
        }
    } catch (error) {
        console.error(`Error ${action}ing friend request:`, error);
        notifications.error('Error', `Failed to ${action} friend request`);
    }
}

// Filter friends based on search query
function filterFriends(query) {
    const friendCards = document.querySelectorAll('.friend-card');
    const requestCards = document.querySelectorAll('.request-card');
    
    if (query === '') {
        // If query is empty, show all
        friendCards.forEach(card => card.style.display = 'flex');
        requestCards.forEach(card => card.style.display = 'flex');
        return;
    }
    
    // Filter friends
    let friendFound = false;
    friendCards.forEach(card => {
        const name = card.querySelector('h3').textContent.toLowerCase();
        const username = card.dataset.username.toLowerCase();
        
        if (name.includes(query) || username.includes(query)) {
            card.style.display = 'flex';
            friendFound = true;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show "no friends" message if no matches in friends
    const friendsList = document.getElementById('friendsList');
    const existingNoFriends = friendsList.querySelector('.no-friends');
    
    if (!friendFound && friendCards.length > 0) {
        if (!existingNoFriends) {
            const noFriendsElement = document.createElement('div');
            noFriendsElement.className = 'no-friends no-results';
            noFriendsElement.textContent = `No friends matching "${query}"`;
            friendsList.appendChild(noFriendsElement);
        } else if (existingNoFriends.classList.contains('no-results')) {
            existingNoFriends.textContent = `No friends matching "${query}"`;
            existingNoFriends.style.display = 'block';
        }
    } else if (existingNoFriends && existingNoFriends.classList.contains('no-results')) {
        existingNoFriends.style.display = 'none';
    }
    
    // Filter requests
    let requestFound = false;
    requestCards.forEach(card => {
        const name = card.querySelector('h3').textContent.toLowerCase();
        const username = card.dataset.username.toLowerCase();
        
        if (name.includes(query) || username.includes(query)) {
            card.style.display = 'flex';
            requestFound = true;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show "no requests" message if no matches in requests
    const requestsList = document.getElementById('friendRequests');
    const existingNoRequests = requestsList.querySelector('.no-requests');
    
    if (!requestFound && requestCards.length > 0) {
        if (!existingNoRequests) {
            const noRequestsElement = document.createElement('div');
            noRequestsElement.className = 'no-requests no-results';
            noRequestsElement.textContent = `No requests matching "${query}"`;
            requestsList.appendChild(noRequestsElement);
        } else if (existingNoRequests.classList.contains('no-results')) {
            existingNoRequests.textContent = `No requests matching "${query}"`;
            existingNoRequests.style.display = 'block';
        }
    } else if (existingNoRequests && existingNoRequests.classList.contains('no-results')) {
        existingNoRequests.style.display = 'none';
    }
} 