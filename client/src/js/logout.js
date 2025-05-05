// Logout functionality for all pages
function logout() {
    // Just redirect to the server-side logout endpoint
    // The server will handle moving the account to recent accounts
    window.location.href = '/logout';
}

// Make sure this function is available globally
window.logout = logout; 