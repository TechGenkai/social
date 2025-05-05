// Password toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const togglePass = document.querySelector('.toggle-pass');
    const passwordInput = document.getElementById('password');
    
    if (togglePass && passwordInput) {
        // Only the eye icon should toggle the password visibility
        togglePass.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event bubbling
            
            // Change password input type
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle the icon
            this.classList.toggle('bi-eye');
            this.classList.toggle('bi-eye-slash');
        });
    }
    
    // Make labels work properly with empty placeholders
    const inputs = document.querySelectorAll('.inp');
    inputs.forEach(input => {
        // Set initial label position based on value
        const label = input.nextElementSibling;
        if (input.value) {
            label.classList.add('active');
        }
        
        // Handle focus events
        input.addEventListener('focus', function() {
            const label = this.nextElementSibling;
            label.classList.add('active');
        });
        
        // Handle blur events
        input.addEventListener('blur', function() {
            const label = this.nextElementSibling;
            if (!this.value) {
                label.classList.remove('active');
            }
        });
    });

    // Add form validation for signup
    const signupForm = document.querySelector('form[action="/signup"]');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // Validate username length
            if (username.length > 15) {
                notifications.error(
                    'Invalid Username',
                    'Username must be 15 characters or less'
                );
                return;
            }
            
            // Validate username characters
            const validUsernamePattern = /^[a-z0-9._]+$/;
            if (!validUsernamePattern.test(username)) {
                notifications.error(
                    'Invalid Username',
                    'Username can only contain lowercase letters, numbers, periods (.) and underscores (_)'
                );
                return;
            }
            
            // Validate password length
            if (password.length < 8) {
                notifications.error(
                    'Invalid Password',
                    'Password must be at least 8 characters long'
                );
                return;
            }
            
            // Check if username is already taken
            try {
                const response = await fetch('/check-username', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    notifications.error(
                        'Validation Error',
                        errorData.error || 'An error occurred during validation.'
                    );
                    return;
                }
                
                const data = await response.json();
                
                if (data.exists) {
                    notifications.error(
                        'Username Taken',
                        'This username is already taken. Please choose another one.'
                    );
                    return;
                }
                
                // If validation passes, submit the form with error handling
                const formData = {
                    username: username,
                    password: password
                };
                
                const signupResponse = await fetch('/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                if (!signupResponse.ok) {
                    const errorMessage = await signupResponse.text();
                    notifications.error(
                        'Signup Failed',
                        errorMessage || 'An error occurred during signup.'
                    );
                    return;
                }
                
                // If everything is successful, the server will handle the redirect
                const responseHtml = await signupResponse.text();
                console.log("Signup successful, processing response");
                
                try {
                    // Extract the script content
                    const scriptMatch = responseHtml.match(/<script>([\s\S]*?)<\/script>/);
                    if (scriptMatch && scriptMatch[1]) {
                        console.log("Script content found, executing...");
                        // Execute the script content
                        eval(scriptMatch[1]);
                    } else {
                        console.warn("No script content found in response, using fallback redirect");
                        // Fallback direct redirect if can't extract script
                        localStorage.setItem('isLoggedIn', 'true');
                        localStorage.setItem('username', formData.username);
                        localStorage.setItem('registrationPending', 'true');
                        
                        window.location.href = '/register';
                    }
                } catch (err) {
                    console.error('Error executing redirect script:', err);
                    // Log the response for debugging
                    console.log('Response HTML:', responseHtml);
                    
                    // Fallback redirect with most basic approach
                    try {
                        localStorage.setItem('isLoggedIn', 'true');
                        localStorage.setItem('username', formData.username);
                        localStorage.setItem('registrationPending', 'true');
                        window.location.replace('/register');
                    } catch (storageErr) {
                        console.error('Error setting localStorage:', storageErr);
                        // Last resort: just navigate
                        window.location.href = '/register';
                    }
                }
            } catch (error) {
                console.error('Error during signup:', error);
                notifications.error(
                    'Error',
                    'An error occurred. Please try again.'
                );
            }
        });
    }
}); 