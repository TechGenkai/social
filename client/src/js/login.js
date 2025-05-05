document.addEventListener('DOMContentLoaded', function() {
    console.log('Login page loaded');
    console.log('Notifications system available:', typeof notifications !== 'undefined');
    const loginForm = document.querySelector('form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');

    // Toggle password visibility
    const togglePass = document.querySelector('.toggle-pass');
    togglePass.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('bi-eye');
        this.classList.toggle('bi-eye-slash');
    });

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Form submitted');
        
        // Disable the login button to prevent double submission
        loginBtn.disabled = true;
        loginBtn.value = 'Logging in...';

        try {
            console.log('Sending login request...');
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    username: usernameInput.value,
                    password: passwordInput.value
                })
            });

            console.log('Response received:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (!response.ok) {
                console.log('Login failed:', data.error);
                
                // Special handling for users with pending registration
                if (data.pendingRegistration) {
                    console.log('User has pending registration, redirecting to registration page');
                    // Store username and login status
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('username', usernameInput.value);
                    localStorage.setItem('registrationPending', 'true');
                    
                    // Redirect to registration page
                    window.location.href = '/register';
                    return;
                }
                
                // Show error notification
                if (typeof notifications !== 'undefined') {
                    console.log('Showing error notification');
                    notifications.error(data.error, data.message);
                } else {
                    console.error('Notifications system not initialized!');
                }
                
                // Re-enable the login button
                loginBtn.disabled = false;
                loginBtn.value = 'Login';
                
                // Clear password field on error
                passwordInput.value = '';
                
                // Focus on the appropriate input based on the error
                if (data.error === 'Invalid Username') {
                    usernameInput.focus();
                } else if (data.error === 'Invalid Password') {
                    passwordInput.focus();
                }
            } else if (data.success) {
                console.log('Login successful, executing redirect script');
                // Show welcome notification
                if (typeof notifications !== 'undefined') {
                    console.log('Showing welcome notification');
                    notifications.success("Welcome Back!", "Welcome back to your account.");
                } else {
                    console.error('Notifications system not initialized!');
                }
                // Execute the redirect script on success
                eval(data.script);
            } else {
                console.log('Unexpected response');
                // Handle unexpected response
                if (typeof notifications !== 'undefined') {
                    notifications.error('Login Error', 'An unexpected error occurred. Please try again.');
                }
                loginBtn.disabled = false;
                loginBtn.value = 'Login';
            }
        } catch (error) {
            console.error('Login error:', error);
            // Show error notification for network/server errors
            if (typeof notifications !== 'undefined') {
                notifications.error('Login Error', 'An error occurred during login. Please try again.');
            }
            
            // Re-enable the login button
            loginBtn.disabled = false;
            loginBtn.value = 'Login';
        }
    });
}); 