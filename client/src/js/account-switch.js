// Account Switching Functionality
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Account switch page loaded');
    
    // Try to load profile data if available
    if (typeof profileManager !== 'undefined') {
        try {
            const userData = await profileManager.fetchProfileData();
            if (userData) {
                console.log('Profile data fetched successfully:', userData);
                
                // Update localStorage with fetched data if needed
                if (userData.displayName) {
                    localStorage.setItem('displayName', userData.displayName);
                }
                
                if (userData.profilePic) {
                    localStorage.setItem('profilePic', userData.profilePic);
                }
            }
        } catch (error) {
            console.error('Error fetching profile data:', error);
        }
    }
    
    // Initialize UI
    initializeAccountSwitcher();
});

// Initialize the account switching UI
function initializeAccountSwitcher() {
    console.log('Initializing account switcher');
    
    // Try to load profile data if on account-switch page
    const currentUser = localStorage.getItem('username');
    if (currentUser) {
        console.log('Current user found:', currentUser);
    }
    
    // Check for existing display name - debug
    const displayName = localStorage.getItem('displayName');
    if (displayName) {
        console.log('Display name found:', displayName);
    } else {
        console.log('No display name found for user:', currentUser);
    }
    
    // Load accounts data
    loadAccounts();
    
    // Initialize password modal events
    initializePasswordModal();
}

// Load active and recent accounts
function loadAccounts() {
    const accountsListContainer = document.getElementById('accountsList');
    
    if (!accountsListContainer) return;
    
    // Get accounts from localStorage
    const activeAccounts = getActiveAccounts();
    const recentAccounts = getRecentAccounts();
    const currentUsername = localStorage.getItem('username');
    
    // Clear container
    accountsListContainer.innerHTML = '';
    
    if (activeAccounts.length === 0 && recentAccounts.length === 0) {
        accountsListContainer.innerHTML = '<div class="no-accounts">No accounts found</div>';
        return;
    }
    
    // First display the currently active account (if any)
    const currentAccount = activeAccounts.find(account => account.username === currentUsername);
    if (currentAccount) {
        accountsListContainer.appendChild(createAccountItem(currentAccount, true));
    }
    
    // Then display other active accounts
    activeAccounts
        .filter(account => account.username !== currentUsername)
        .forEach(account => {
            accountsListContainer.appendChild(createAccountItem(account, true));
        });
    
    // Finally display logged out accounts
    recentAccounts.forEach(account => {
        accountsListContainer.appendChild(createAccountItem(account, false));
    });
}

// Get active accounts from localStorage
function getActiveAccounts() {
    try {
        // In a real app, this would come from a more secure storage like sessions
        // For demo purposes, we're using localStorage
        const activeAccountsJSON = localStorage.getItem('activeAccounts');
        
        if (activeAccountsJSON) {
            const accounts = JSON.parse(activeAccountsJSON);
            
            // Add current account if not already in the list
            const username = localStorage.getItem('username');
            if (!username) return accounts;
            
            // Get profile data for current user more comprehensively
            const displayName = localStorage.getItem('displayName');
            
            // Handle profile picture correctly
            let profilePic = '/images/default-profile.png';
            const storedProfilePic = localStorage.getItem('profilePic');
            if (storedProfilePic && 
                storedProfilePic !== 'undefined' && 
                storedProfilePic !== 'null') {
                profilePic = storedProfilePic;
            }
            
            const currentUser = {
                username: username,
                displayName: displayName || username,
                profilePic: profilePic,
                lastActive: Date.now()
            };
            
            // Check if current user is already in the list
            const existingAccount = accounts.find(account => account.username === currentUser.username);
            
            if (existingAccount) {
                // Update existing account information if needed
                if (displayName && existingAccount.displayName !== displayName) {
                    existingAccount.displayName = displayName;
                }
                
                // Update profile picture if needed
                if (profilePic !== '/images/default-profile.png' && 
                    existingAccount.profilePic !== profilePic) {
                    existingAccount.profilePic = profilePic;
                }
                
                existingAccount.lastActive = Date.now();
                localStorage.setItem('activeAccounts', JSON.stringify(accounts));
            } else if (username !== 'Unknown') {
                // Add new user to accounts
                accounts.push(currentUser);
                localStorage.setItem('activeAccounts', JSON.stringify(accounts));
            }
            
            return accounts;
        }
        
        // If no active accounts exist, create array with the current user
        const username = localStorage.getItem('username');
        if (!username) return [];
        
        const displayName = localStorage.getItem('displayName');
        
        // Handle profile picture correctly
        let profilePic = '/images/default-profile.png';
        const storedProfilePic = localStorage.getItem('profilePic');
        if (storedProfilePic && 
            storedProfilePic !== 'undefined' && 
            storedProfilePic !== 'null') {
            profilePic = storedProfilePic;
        }
        
        const currentUser = {
            username: username,
            displayName: displayName || username,
            profilePic: profilePic,
            lastActive: Date.now()
        };
        
        localStorage.setItem('activeAccounts', JSON.stringify([currentUser]));
        return [currentUser];
    } catch (error) {
        console.error('Error getting active accounts:', error);
        return [];
    }
}

// Get recent (logged out) accounts from localStorage
function getRecentAccounts() {
    try {
        const recentAccountsJSON = localStorage.getItem('recentAccounts');
        if (!recentAccountsJSON) return [];
        
        // Parse accounts and validate each one
        const accounts = JSON.parse(recentAccountsJSON);
        
        // Get current active accounts to filter them out
        const activeAccountsJSON = localStorage.getItem('activeAccounts');
        const activeAccounts = activeAccountsJSON ? JSON.parse(activeAccountsJSON) : [];
        const activeUsernames = activeAccounts.map(account => account.username);
        
        // Filter out any accounts that are already in the active accounts list
        const filteredAccounts = accounts.filter(account => !activeUsernames.includes(account.username));
        
        // Validate each account's profile picture
        return filteredAccounts.map(account => {
            // Ensure valid profile picture
            if (!account.profilePic || 
                account.profilePic === 'undefined' || 
                account.profilePic === 'null') {
                account.profilePic = '/images/default-profile.png';
            }
            
            // Ensure valid display name
            if (!account.displayName) {
                account.displayName = account.username || 'Unknown User';
            }
            
            return account;
        });
    } catch (error) {
        console.error('Error getting recent accounts:', error);
        return [];
    }
}

// Create account item element
function createAccountItem(account, isActive) {
    const accountItem = document.createElement('div');
    const currentUsername = localStorage.getItem('username');
    const isCurrentUser = isActive && account.username === currentUsername;
    
    accountItem.className = `account-item${isActive ? ' active' : ' logged-out'}`;
    accountItem.dataset.username = account.username;
    
    // Ensure we have valid display values and default profile picture
    const displayName = account.displayName || account.username || 'Unknown User';
    const username = account.username || 'unknown';
    
    // Default profile picture handling
    let profilePic = '/images/default-profile.png';
    if (account.profilePic && account.profilePic !== 'undefined' && account.profilePic !== 'null') {
        profilePic = account.profilePic;
    }
    
    accountItem.innerHTML = `
        <img src="${profilePic}" alt="${displayName}" class="account-avatar${isActive ? '' : ' logged-out'}" onerror="this.src='/images/default-profile.png'">
        <div class="account-info">
            <div class="account-name">${displayName}</div>
            <div class="account-username">@${username}</div>
            <div class="account-status${isCurrentUser ? ' active' : ''}">
                ${isCurrentUser ? 'Active now' : (isActive ? '' : 'Logged out')}
            </div>
        </div>
        <div class="account-actions">
            ${isActive ? 
                `<button class="switch-btn" data-action="switch" data-username="${username}">
                    <i class="bi bi-box-arrow-in-right"></i> Use
                </button>` 
                : 
                `<button class="switch-btn" data-action="login" data-username="${username}">
                    <i class="bi bi-key"></i> Log in
                </button>`
            }
            <button class="remove-btn" data-action="remove" data-username="${username}">
                <i class="bi bi-x-circle"></i> Remove
            </button>
        </div>
    `;
    
    // Add event listeners to buttons
    const switchBtn = accountItem.querySelector('[data-action="switch"], [data-action="login"]');
    const removeBtn = accountItem.querySelector('[data-action="remove"]');
    
    if (switchBtn) {
        switchBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const action = this.dataset.action;
            const username = this.dataset.username;
            
            if (action === 'switch') {
                switchToAccount(username);
            } else if (action === 'login') {
                showPasswordModal(username);
            }
        });
    }
    
    if (removeBtn) {
        removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            removeAccount(this.dataset.username, isActive);
        });
    }
    
    // Make entire account item clickable for active accounts
    if (isActive) {
        accountItem.addEventListener('click', function() {
            switchToAccount(this.dataset.username);
        });
    }
    
    return accountItem;
}

// Switch to an already logged in account
function switchToAccount(username) {
    try {
        // Get active accounts
        const activeAccountsJSON = localStorage.getItem('activeAccounts');
        if (!activeAccountsJSON) return false;
        
        const activeAccounts = JSON.parse(activeAccountsJSON);
        
        // Find the account in active accounts
        const accountToSwitch = activeAccounts.find(account => account.username === username);
        if (!accountToSwitch) return false;
        
        // Get current active user
        const currentUsername = localStorage.getItem('username');
        if (currentUsername === username) {
            // Already using this account, just redirect
            window.location.href = '/';
            return true;
        }
        
        // Update account as active
        localStorage.setItem('username', accountToSwitch.username);
        localStorage.setItem('displayName', accountToSwitch.displayName || accountToSwitch.username);
        localStorage.setItem('profilePic', accountToSwitch.profilePic || '/images/default-profile.png');
        localStorage.setItem('isLoggedIn', 'true');
        
        // Reset flag
        sessionStorage.removeItem('justLoggedIn');
        
        // Update last active timestamp
        accountToSwitch.lastActive = Date.now();
        localStorage.setItem('activeAccounts', JSON.stringify(activeAccounts));
        
        // Remove the account from recent accounts if it exists there
        const recentAccountsJSON = localStorage.getItem('recentAccounts');
        if (recentAccountsJSON) {
            const recentAccounts = JSON.parse(recentAccountsJSON);
            const updatedRecentAccounts = recentAccounts.filter(account => account.username !== username);
            localStorage.setItem('recentAccounts', JSON.stringify(updatedRecentAccounts));
        }
        
        // Refresh the UI to update active status indicators
        loadAccounts();
        
        // Show success notification and redirect
        notifications.success('Account Switched', `Logged in as ${accountToSwitch.displayName || accountToSwitch.username}`);
        setTimeout(() => {
            window.location.href = '/';
        }, 800);
        
        return true;
    } catch (error) {
        console.error('Error switching account:', error);
        notifications.error('Error', 'Failed to switch account');
        return false;
    }
}

// Remove an account from the accounts list
function removeAccount(username, isActive) {
    if (!confirm(`Remove ${username} from your accounts?`)) return;
    
    if (isActive) {
        // Remove from active accounts
        const activeAccountsJSON = localStorage.getItem('activeAccounts');
        if (activeAccountsJSON) {
            let activeAccounts = JSON.parse(activeAccountsJSON);
            activeAccounts = activeAccounts.filter(account => account.username !== username);
            localStorage.setItem('activeAccounts', JSON.stringify(activeAccounts));
        }
    } else {
        // Remove from recent accounts
        const recentAccountsJSON = localStorage.getItem('recentAccounts');
        if (recentAccountsJSON) {
            let recentAccounts = JSON.parse(recentAccountsJSON);
            recentAccounts = recentAccounts.filter(account => account.username !== username);
            localStorage.setItem('recentAccounts', JSON.stringify(recentAccounts));
        }
    }
    
    // Remove the account item from the DOM
    const accountItem = document.querySelector(`.account-item[data-username="${username}"]`);
    if (accountItem) {
        accountItem.remove();
    }
    
    // Check if we need to show the "No accounts" message
    const accountsList = document.getElementById('accountsList');
    if (accountsList && accountsList.children.length === 0) {
        accountsList.innerHTML = '<div class="no-accounts">No accounts found</div>';
    }
}

// Initialize password modal events
function initializePasswordModal() {
    // Create modal if it doesn't exist
    if (!document.getElementById('passwordModal')) {
        const modal = document.createElement('div');
        modal.id = 'passwordModal';
        modal.className = 'password-modal';
        
        modal.innerHTML = `
            <div class="password-modal-content">
                <div class="password-modal-header">
                    <h3>Enter Password</h3>
                    <button type="button" class="password-modal-close">&times;</button>
                </div>
                <form class="password-form" id="passwordForm">
                    <input type="hidden" id="loginUsername" value="">
                    <div class="field">
                        <input type="password" id="loginPassword" placeholder="Password" required>
                        <span class="toggle-pass bi bi-eye"></span>
                    </div>
                    <div class="error-message" id="passwordError">Incorrect password</div>
                    <button type="submit">Log in</button>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners to modal
        const closeBtn = modal.querySelector('.password-modal-close');
        const form = modal.querySelector('#passwordForm');
        const togglePass = modal.querySelector('.toggle-pass');
        
        closeBtn.addEventListener('click', function() {
            modal.classList.remove('show');
        });
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            attemptLogin();
        });
        
        togglePass.addEventListener('click', function() {
            const passwordInput = document.getElementById('loginPassword');
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.classList.toggle('bi-eye');
            this.classList.toggle('bi-eye-slash');
        });
        
        // Close modal if clicked outside content
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    }
}

// Show password modal for logging in to a logged-out account
function showPasswordModal(username) {
    const modal = document.getElementById('passwordModal');
    if (!modal) return;
    
    // Set username in hidden field
    const usernameInput = document.getElementById('loginUsername');
    if (usernameInput) usernameInput.value = username;
    
    // Clear password field and error message
    const passwordInput = document.getElementById('loginPassword');
    if (passwordInput) passwordInput.value = '';
    
    const errorMsg = document.getElementById('passwordError');
    if (errorMsg) errorMsg.classList.remove('show');
    
    // Show modal
    modal.classList.add('show');
    
    // Focus on password field
    if (passwordInput) passwordInput.focus();
}

// Attempt to log in with the given username and password
function attemptLogin() {
    // Get values from modal
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    if (!username || !password) {
        document.getElementById('password-error').textContent = 'Username and password are required';
        return;
    }
    
    // For demo purposes only! In a real app, this would be a server request
    mockAuthenticate(username, password)
        .then(userData => {
            // Successfully authenticated
            console.log('Authentication successful:', userData);
            
            // Update user data in localStorage
            localStorage.setItem('username', userData.username);
            localStorage.setItem('displayName', userData.displayName || userData.username);
            localStorage.setItem('profilePic', userData.profilePic || '/images/default-profile.png');
            localStorage.setItem('isLoggedIn', 'true');
            
            // Add to active accounts
            const activeAccountsJSON = localStorage.getItem('activeAccounts');
            let activeAccounts = activeAccountsJSON ? JSON.parse(activeAccountsJSON) : [];
            
            // Check if user already exists in active accounts
            const existingIndex = activeAccounts.findIndex(acc => acc.username === userData.username);
            if (existingIndex >= 0) {
                // Update existing account
                activeAccounts[existingIndex] = {
                    ...activeAccounts[existingIndex],
                    ...userData,
                    lastActive: Date.now()
                };
            } else {
                // Add new account
                activeAccounts.push({
                    ...userData,
                    lastActive: Date.now()
                });
            }
            
            localStorage.setItem('activeAccounts', JSON.stringify(activeAccounts));
            
            // Remove from recent accounts if present
            const recentAccountsJSON = localStorage.getItem('recentAccounts');
            if (recentAccountsJSON) {
                const recentAccounts = JSON.parse(recentAccountsJSON);
                const updatedRecentAccounts = recentAccounts.filter(acc => acc.username !== userData.username);
                localStorage.setItem('recentAccounts', JSON.stringify(updatedRecentAccounts));
            }
            
            // Close modal and redirect
            const modal = document.getElementById('password-modal');
            if (modal) modal.style.display = 'none';
            
            notifications.success('Login Successful', `Welcome back, ${userData.displayName || userData.username}!`);
            
            setTimeout(() => {
                window.location.href = '/';
            }, 800);
        })
        .catch(error => {
            console.error('Authentication error:', error);
            document.getElementById('password-error').textContent = error.message || 'Invalid username or password';
        });
}

// Mock authentication function for demo purposes
// In a real app, this would be a server request
function mockAuthenticate(username, password) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (password === 'password') {
                // Get user data from recent accounts if available
                const recentAccountsJSON = localStorage.getItem('recentAccounts');
                const recentAccounts = recentAccountsJSON ? JSON.parse(recentAccountsJSON) : [];
                const account = recentAccounts.find(acc => acc.username === username);
                
                if (account) {
                    // Return existing account data
                    resolve({
                        username: account.username,
                        displayName: account.displayName || account.username,
                        profilePic: account.profilePic || '/images/default-profile.png'
                    });
                } else {
                    // Create new account data
                    resolve({
                        username: username,
                        displayName: username,
                        profilePic: '/images/default-profile.png'
                    });
                }
            } else {
                reject({ message: 'Invalid username or password' });
            }
        }, 500); // Simulate network delay
    });
}

// Update logout functionality to handle account switching
function logout() {
    // Just redirect to the server-side logout endpoint
    // The server will handle removing the account from active accounts
    window.location.href = '/logout';
}

// Expose logout function globally for use by logout button
window.logout = logout; 