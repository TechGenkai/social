//script.js for header.html
document.addEventListener("DOMContentLoaded", function () {
    fetch("header.html")
      .then(response => response.text())
      .then(data => {
        document.getElementById("header-container").innerHTML = data;
      })
      .catch(error => console.error("Error loading sidebar:", error));
  });

//script.js for rightbar.html
document.addEventListener("DOMContentLoaded", function () {
  fetch("rightbar.html")
    .then(response => response.text())
    .then(data => {
      document.getElementById("rightbar-container").innerHTML = data;
    })
    .catch(error => console.error("Error loading sidebar:", error));
});

document.addEventListener("DOMContentLoaded", function () {
  fetch("leftbar.html")
    .then(response => response.text())
    .then(data => {
      document.getElementById("leftbar-container").innerHTML = data;
    })
    .catch(error => console.error("Error loading sidebar:", error));
});

document.addEventListener('DOMContentLoaded', function() {
  const username = localStorage.getItem('username');
  if (!username) {
      window.location.href = '/login';
      return;
  }

  if (sessionStorage.getItem('justLoggedIn') === 'true') {
      // Show welcome notification
      notifications.success("Welcome Back!", "Welcome back to your account.");
      // Clear the flag
      sessionStorage.removeItem('justLoggedIn');
  }
});