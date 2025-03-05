document.addEventListener("DOMContentLoaded", function () {
  const toggleBtn = document.getElementById("toggle-btn");
  const sidebar = document.getElementById("sidebar");

  toggleBtn.addEventListener("click", function () {
    // Toggle the active class on the sidebar
    sidebar.classList.toggle("active");
    // Update the toggle button icon based on sidebar state
    if (sidebar.classList.contains("active")) {
      toggleBtn.innerHTML = "&times;"; // X icon for closing
    } else {
      toggleBtn.innerHTML = "&#9776;"; // Hamburger menu
    }
  });
});
