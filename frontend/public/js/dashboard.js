// JavaScript to toggle sidebar and change icon smoothly
const toggleBtn = document.getElementById("toggle-btn");
const toggleIcon = toggleBtn.querySelector("span");
const sidebar = document.getElementById("sidebar");

toggleBtn.addEventListener("click", function () {
  sidebar.classList.toggle("active");
  toggleBtn.classList.toggle("active");
  toggleIcon.textContent = sidebar.classList.contains("active") ? "✕" : "☰";
});
