// Profile Manager Module
const profileManager = {
    // Cache for profile data
    profileData: null,
    
    // Initialize profile manager
    init() {
        this.updateProfileUI();
        // Listen for profile updates
        window.addEventListener('profileUpdated', () => this.updateProfileUI());
    },

    // Fetch profile data
    async fetchProfileData() {
        const username = localStorage.getItem('username');
        if (!username) return null;

        try {
            const response = await fetch('/api/user/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-username': username
                },
                credentials: 'include'
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            
            this.profileData = data;
            return data;
        } catch (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
    },

    // Update all profile-related UI elements
    async updateProfileUI() {
        const data = await this.fetchProfileData();
        if (!data) return;
        
        // Debug log
        console.log('Profile data received:', data);

        // Update profile pictures
        const profilePics = document.querySelectorAll('img[id$="ProfilePic"]');
        profilePics.forEach(pic => {
            pic.src = data.profilePic || '/images/default-profile.png';
            pic.alt = data.displayName || 'Profile';
            // Add round-profile class to navbar profile picture
            if (pic.id === 'navProfilePic') {
                pic.classList.add('round-profile');
            }
        });
        
        // Update main profile picture on profile page
        const mainProfilePic = document.getElementById('profilePic');
        if (mainProfilePic) {
            mainProfilePic.src = data.profilePic || '/images/default-profile.png';
            mainProfilePic.alt = data.displayName || 'Profile Picture';
        }

        // Update sidebar profile links with display name
        const profileLinks = document.querySelectorAll('.sidebar a[href="/profile"]');
        profileLinks.forEach(link => {
            const img = link.querySelector('img');
            if (img) {
                link.innerHTML = '';
                link.appendChild(img);
                link.appendChild(document.createTextNode(data.displayName || 'Display Name'));
            }
        });

        // Format date of birth according to device locale if it's a valid date
        let formattedDob = 'Not specified';
        if (data.dob && data.dob !== 'Not specified') {
            try {
                const dobDate = new Date(data.dob);
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

        // Update display name and username if elements exist
        const displayNameEl = document.getElementById('displayName');
        const usernameEl = document.getElementById('username');
        const genderEl = document.getElementById('gender');
        const dobEl = document.getElementById('dob');
        
        if (displayNameEl) displayNameEl.textContent = data.displayName || 'Display Name';
        if (usernameEl) usernameEl.textContent = `@${data.username || 'username'}`;
        if (genderEl) genderEl.textContent = data.gender || 'Not specified';
        if (dobEl) dobEl.textContent = formattedDob;
    },

    // Update profile picture
    async updateProfilePicture(file) {
        const username = localStorage.getItem('username');
        if (!username) return false;

        try {
            const formData = new FormData();
            formData.append('profilePic', file);
            formData.append('username', username);
            
            const response = await fetch('/upload-profile-pic', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Upload failed');
            
            // Update profile data with new picture URL
            this.profileData.profilePic = data.profilePic;
            
            // Trigger profile update event
            window.dispatchEvent(new Event('profileUpdated'));
            return true;
        } catch (error) {
            console.error('Error updating profile picture:', error);
            notifications.error('Upload Failed', 'Failed to upload profile picture. Please try again.');
            return false;
        }
    },

    // Update profile details
    async updateProfileDetails(displayName, gender, dateOfBirth) {
        const username = localStorage.getItem('username');
        if (!username) return false;

        try {
            const response = await fetch('/api/user/profile/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-username': username
                },
                body: JSON.stringify({
                    displayName,
                    gender,
                    dateOfBirth
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);
            
            // Trigger profile update event
            window.dispatchEvent(new Event('profileUpdated'));
            return true;
        } catch (error) {
            console.error('Error updating profile details:', error);
            return false;
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => profileManager.init()); 