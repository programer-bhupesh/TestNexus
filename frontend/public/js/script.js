const toggleBtn = document.getElementById("toggle-btn");
const sidebar = document.getElementById("sidebar");
const mainContent = document.querySelector(".main-content");

toggleBtn.addEventListener("click", function () {
  sidebar.classList.toggle("closed");
  // Adjust main content margin based on sidebar state
  if (sidebar.classList.contains("closed")) {
    mainContent.style.marginLeft = "0";
  } else {
    mainContent.style.marginLeft = getComputedStyle(
      document.documentElement
    ).getPropertyValue("--sidebar-width");
  }
});
