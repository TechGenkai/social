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