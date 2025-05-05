document.addEventListener('DOMContentLoaded', () => {
    console.log("Register page loaded");
    
    // Check if the user should be on this page
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const isPendingRegistration = localStorage.getItem('registrationPending') === 'true';
    const username = localStorage.getItem('username');
    
    console.log("Auth status:", { isLoggedIn, isPendingRegistration, username });
    
    if (!isLoggedIn || !isPendingRegistration || !username) {
        console.warn("User shouldn't be on registration page, redirecting...");
        window.location.replace('/signup');
        return;
    }

    const profilePicture = document.getElementById('profile-picture');
    const profilePreview = document.getElementById('profile-preview');
    const uploadBtn = document.querySelector('.upload-btn');
    const registerForm = document.getElementById('register-form');
    const dateInput = document.getElementById('date-of-birth');
    const calendarIcon = document.querySelector('.calendar-icon');

    // Handle profile picture upload
    uploadBtn.addEventListener('click', () => {
        profilePicture.click();
    });

    profilePicture.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                profilePreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Handle calendar icon click
    calendarIcon.addEventListener('click', () => {
        dateInput.showPicker();
    });

    // Handle form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const displayName = document.getElementById('display-name').value.trim();
        const gender = document.getElementById('gender').value;
        const dateOfBirth = document.getElementById('date-of-birth').value;
        const profilePic = profilePicture.files[0];
        const username = localStorage.getItem('username'); // Get the logged-in username

        let hasError = false;
        let errors = [];

        // Validate required fields
        if (!displayName) {
            errors.push({
                title: 'Required Field',
                message: 'Display name is required'
            });
            hasError = true;
        }

        if (!gender) {
            errors.push({
                title: 'Required Field',
                message: 'Please select your gender'
            });
            hasError = true;
        }

        if (!dateOfBirth) {
            errors.push({
                title: 'Required Field',
                message: 'Date of birth is required'
            });
            hasError = true;
        }

        // Validate display name length
        if (displayName && displayName.length > 15) {
            errors.push({
                title: 'Invalid Display Name',
                message: 'Display name must be 15 characters or less'
            });
            hasError = true;
        }

        // Validate date format and age
        if (dateOfBirth) {
            const birthDate = new Date(dateOfBirth);
            const today = new Date();

            // Check if the date is valid
            if (isNaN(birthDate.getTime())) {
                errors.push({
                    title: 'Invalid Date',
                    message: 'Please enter a valid date of birth'
                });
                hasError = true;
            } else {
                // Check if the date is in the future
                if (birthDate > today) {
                    errors.push({
                        title: 'Invalid Date',
                        message: 'Date of birth cannot be in the future'
                    });
                    hasError = true;
                } else {
                    // Calculate age
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    
                    if (age < 13) {
                        errors.push({
                            title: 'Age Restriction',
                            message: 'You must be at least 13 years old to register'
                        });
                        hasError = true;
                    }
                }
            }
        }

        // Show all errors
        if (hasError) {
            errors.forEach(error => {
                notifications.error(error.title, error.message);
            });
            return;
        }

        // Create form data
        const formData = new FormData();
        formData.append('displayName', displayName);
        formData.append('gender', gender);
        formData.append('dateOfBirth', dateOfBirth);
        formData.append('username', username);
        if (profilePic) {
            formData.append('profilePic', profilePic);
        }

        try {
            console.log('Submitting registration form...');
            const response = await fetch('/register', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                console.error('Registration failed with status:', response.status);
                throw new Error('Registration failed');
            }

            // Get the response text and execute the redirect script
            const result = await response.text();
            console.log('Registration successful, processing response');
            
            try {
                const scriptMatch = result.match(/<script>([\s\S]*?)<\/script>/);
                if (scriptMatch && scriptMatch[1]) {
                    console.log('Script content found, executing...');
                    const scriptContent = scriptMatch[1];
                    eval(scriptContent);
                } else {
                    console.warn('No script found in response, using fallback redirect');
                    // Remove registration pending flag
                    localStorage.removeItem('registrationPending');
                    // Redirect to home page
                    window.location.href = '/';
                }
            } catch (scriptError) {
                console.error('Error executing redirect script:', scriptError);
                // Fallback redirect
                localStorage.removeItem('registrationPending');
                window.location.replace('/');
            }
        } catch (error) {
            console.error('Registration error:', error);
            notifications.error(
                'Registration Failed',
                'An error occurred during registration. Please try again.'
            );
        }
    });
});
