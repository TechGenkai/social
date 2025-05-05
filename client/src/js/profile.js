document.addEventListener('DOMContentLoaded', function() {
    // Initialize the profile manager
    const username = localStorage.getItem('username');
    
    if (!username) {
        window.location.href = '/login';
        return;
    }

    // Initialize UI
    initializeUI();

    // Load friends and friend requests
    loadFriends();
    loadFriendRequests();
});

async function initializeUI() {
    try {
        // Get user's profile data
        const userData = await profileManager.fetchProfileData();
        
        if (!userData) {
            console.error('Failed to load profile data');
            notifications.error('Error', 'Failed to load profile data');
            return;
        }
        
        // Update profile display
        updateProfileDisplay(userData);
        
        // Set up event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing UI:', error);
        notifications.error('Error', 'Failed to initialize profile page');
    }
}

function updateProfileDisplay(userData) {
    // Update profile information
    document.getElementById('displayName').textContent = userData.displayName || userData.username;
    document.getElementById('username').textContent = '@' + userData.username;
    document.getElementById('gender').textContent = userData.gender;
    
    // Add online status indicator (always online for your own profile)
    const usernameElement = document.getElementById('username');
    if (usernameElement && usernameElement.parentNode) {
        // Remove existing status if any
        const existingStatus = document.getElementById('onlineStatusIndicator');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        // Create online status indicator
        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'onlineStatusIndicator';
        statusIndicator.className = 'user-status online';
        statusIndicator.innerHTML = '<i class="bi bi-circle-fill"></i> Online';
        
        // Insert after username
        usernameElement.parentNode.insertBefore(statusIndicator, usernameElement.nextSibling);
    }
    
    // No longer adding online indicator to profile picture
    
    // Update friend count
    const friendCountElement = document.getElementById('friendCount');
    if (friendCountElement) {
        friendCountElement.textContent = userData.friendCount || 0;
    }
    
    // Format date of birth if present
    let formattedDob = 'Not specified';
    if (userData.dob && userData.dob !== 'Not specified') {
        try {
            const dobDate = new Date(userData.dob);
            if (!isNaN(dobDate.getTime())) {
                formattedDob = dobDate.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        } catch (e) {
            console.error('Error formatting date:', e);
        }
    }
    document.getElementById('dob').textContent = formattedDob;
    
    // Update profile picture
    const profilePic = document.getElementById('profilePic');
    const navProfilePic = document.getElementById('navProfilePic');
    const sidebarProfilePic = document.getElementById('sidebarProfilePic');
    
    if (profilePic) profilePic.src = userData.profilePic || '/images/default-profile.png';
    if (navProfilePic) {
        navProfilePic.src = userData.profilePic || '/images/default-profile.png';
        navProfilePic.classList.add('round-profile');
    }
    if (sidebarProfilePic) sidebarProfilePic.src = userData.profilePic || '/images/default-profile.png';
    
    // Update sidebar profile link text
    const profileLink = document.querySelector('.sidebar a[href="/profile"]');
    if (profileLink && sidebarProfilePic) {
        profileLink.innerHTML = '';
        profileLink.appendChild(sidebarProfilePic.cloneNode());
        profileLink.appendChild(document.createTextNode(userData.displayName || 'Profile'));
    }
}

function setupEventListeners() {
    // Edit profile button
    const editProfileBtn = document.getElementById('editProfile');
    const editProfileModal = document.getElementById('editProfileModal');
    const cancelEditBtn = document.getElementById('cancelEditProfile');
    
    if (editProfileBtn && editProfileModal) {
        editProfileBtn.addEventListener('click', function() {
            populateEditForm();
            editProfileModal.style.display = 'flex';
        });
    }
    
    if (cancelEditBtn && editProfileModal) {
        cancelEditBtn.addEventListener('click', function() {
            editProfileModal.style.display = 'none';
        });
    }
    
    // Change password button and modal
    const changePasswordBtn = document.getElementById('changePassword');
    const changePasswordModal = document.getElementById('changePasswordModal');
    const cancelChangePasswordBtn = document.getElementById('cancelChangePassword');
    const changePasswordForm = document.getElementById('changePasswordForm');

    if (changePasswordBtn && changePasswordModal) {
        changePasswordBtn.addEventListener('click', function() {
            changePasswordModal.style.display = 'flex';
        });
    }

    if (cancelChangePasswordBtn && changePasswordModal) {
        cancelChangePasswordBtn.addEventListener('click', function() {
            changePasswordModal.style.display = 'none';
            changePasswordForm.reset();
        });
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await changePassword();
        });
    }

    // Add password toggle functionality
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    togglePasswordButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.classList.remove('bi-eye-slash-fill');
                this.classList.add('bi-eye-fill');
                this.classList.add('active');
            } else {
                passwordInput.type = 'password';
                this.classList.remove('bi-eye-fill');
                this.classList.add('bi-eye-slash-fill');
                this.classList.remove('active');
            }
        });
    });
    
    // Profile picture click handler
    const profilePic = document.getElementById('profilePic');
    const uploadPicModal = document.getElementById('uploadPicModal');
    const cancelUploadBtn = document.getElementById('cancelUploadPic');
    
    if (profilePic && uploadPicModal) {
        profilePic.style.cursor = 'pointer';
        profilePic.addEventListener('click', function() {
            // Reset file input and preview when opening modal
            const fileInput = document.getElementById('profilePicFile');
            const previewImg = document.querySelector('#imagePreview img');
            const fileNameDisplay = document.getElementById('selectedFileName');
            const uploadButton = document.getElementById('uploadPicButton');
            
            if (fileInput) fileInput.value = '';
            // Set preview to user's current profile pic
            if (previewImg && profileManager.profileData) {
                previewImg.src = profileManager.profileData.profilePic || '/images/default-profile.png';
            }
            if (fileNameDisplay) fileNameDisplay.textContent = 'No file selected';
            if (uploadButton) uploadButton.disabled = true;
            
            uploadPicModal.style.display = 'flex';
        });
    }
    
    if (cancelUploadBtn && uploadPicModal) {
        cancelUploadBtn.addEventListener('click', function() {
            // Reset preview to user's current profile pic when canceling
            const previewImg = document.querySelector('#imagePreview img');
            if (previewImg && profileManager.profileData) {
                previewImg.src = profileManager.profileData.profilePic || '/images/default-profile.png';
            }
            uploadPicModal.style.display = 'none';
        });
    }
    
    // Profile picture preview handler
    const profilePicFile = document.getElementById('profilePicFile');
    const imagePreview = document.getElementById('imagePreview');
    const fileNameDisplay = document.getElementById('selectedFileName');
    const uploadButton = document.getElementById('uploadPicButton');
    
    if (profilePicFile && imagePreview) {
        profilePicFile.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                // Update file name display
                if (fileNameDisplay) {
                    fileNameDisplay.textContent = file.name;
                }
                
                // Validate file type
                if (!file.type.match(/image\/(jpeg|jpg|png|gif)/i)) {
                    notifications.error('Invalid File', 'Please select a valid image file (JPG, PNG, or GIF)');
                    profilePicFile.value = '';
                    fileNameDisplay.textContent = 'No file selected';
                    if (uploadButton) uploadButton.disabled = true;
                    return;
                }
                
                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    notifications.error('File Too Large', 'The image must be smaller than 5MB');
                    profilePicFile.value = '';
                    fileNameDisplay.textContent = 'No file selected';
                    if (uploadButton) uploadButton.disabled = true;
                    return;
                }
                
                // Enable upload button
                if (uploadButton) uploadButton.disabled = false;
                
                // Show preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = imagePreview.querySelector('img');
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                // Disable upload button when no file is selected
                if (uploadButton) uploadButton.disabled = true;
                if (fileNameDisplay) fileNameDisplay.textContent = 'No file selected';
            }
        });
    }
    
    // Profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await updateProfile();
        });
    }
    
    // Profile picture upload
    const uploadPicForm = document.getElementById('uploadPicForm');
    if (uploadPicForm) {
        uploadPicForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const uploadButton = document.getElementById('uploadPicButton');
            if (uploadButton) {
                // Disable button and show loading state
                uploadButton.disabled = true;
                uploadButton.innerHTML = '<i class="bi bi-arrow-repeat"></i> Uploading...';
                uploadButton.classList.add('loading');
            }
            
            await uploadProfilePicture();
        });
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === editProfileModal) {
            editProfileModal.style.display = 'none';
        }
        if (e.target === uploadPicModal) {
            // Reset preview to user's current profile pic when closing modal
            const previewImg = document.querySelector('#imagePreview img');
            if (previewImg && profileManager.profileData) {
                previewImg.src = profileManager.profileData.profilePic || '/images/default-profile.png';
            }
            uploadPicModal.style.display = 'none';
        }
    });
}

async function loadFriends() {
    try {
        const username = localStorage.getItem('username');
        
        const response = await fetch('/api/friends', {
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
        
        // Update the UI with friends
        renderFriendsList(data.friends);
    } catch (error) {
        console.error('Error loading friends:', error);
        notifications.error('Error', 'Failed to load friends list');
    }
}

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
        
        // Update the UI with friend requests
        renderFriendRequests(data.requests);
    } catch (error) {
        console.error('Error loading friend requests:', error);
        notifications.error('Error', 'Failed to load friend requests');
    }
}

function renderFriendsList(friends) {
    const friendsListElement = document.getElementById('friendsList');
    
    if (!friendsListElement) {
        console.error('Friends list element not found');
        return;
    }
    
    // Clear current content
    friendsListElement.innerHTML = '';
    
    if (!friends || friends.length === 0) {
        const noFriendsElement = document.createElement('div');
        noFriendsElement.className = 'no-friends';
        noFriendsElement.textContent = "You haven't added any friends yet";
        friendsListElement.appendChild(noFriendsElement);
        return;
    }
    
    // Render each friend
    friends.forEach(friend => {
        const friendCard = document.createElement('div');
        friendCard.className = 'friend-card';
        
        friendCard.innerHTML = `
            <img src="${friend.profilePic || '/images/default-profile.png'}" alt="${friend.displayName}">
            <div class="friend-info">
                <h3>${friend.displayName}</h3>
                <p>@${friend.username}</p>
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
}

function renderFriendRequests(requests) {
    // Implementation of renderFriendRequests function
}