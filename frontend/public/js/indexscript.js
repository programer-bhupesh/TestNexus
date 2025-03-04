let adminlogin = document.getElementById("AdimLogin");
let studentlogin = document.getElementById("StudengLogin");
let teacherlogin=document.getElementById("TeacherLogin")
adminlogin.addEventListener('click',()=>{
    window.location.href = "/adminlogin";
});


studentlogin.addEventListener('click',()=>{
  window.location.href = "/studentlogin";
});

teacherlogin.addEventListener("click",()=>{
  window.location.href="/teacherlogin";
});

const body=document.querySelector('body');
// Get the container element where bubbles will be added
const bubbleContainer = document.createElement('div');
bubbleContainer.classList.add('bubbles');
body.appendChild(bubbleContainer);
// Function to create a new bubble element
function createBubble() {
  // Create the bubble div and add the "bubble" class
  const bubble = document.createElement('div');
  bubble.classList.add('bubble');

  // Randomize properties for variety
  const size = Math.floor(Math.random() * 50) + 30; // size between 30px and 80px
  const left = Math.floor(Math.random() * 100); // left position from 0% to 100%
  const duration = Math.random() * 10 + 12; // animation duration between 12s and 22s
  const delay = Math.random() * 5; // animation delay between 0s and 5s

  // Set CSS custom properties on the bubble element
  bubble.style.setProperty('--size', `${size}px`);
  bubble.style.setProperty('--left', `${left}%`);
  bubble.style.setProperty('--duration', `${duration}s`);
  bubble.style.setProperty('--delay', `${delay}s`);

  // Append the bubble to the container
  bubbleContainer.appendChild(bubble);

  // Calculate total time (delay + duration) and remove the bubble afterward
  const totalTime = (duration + delay) * 1000;
  setTimeout(() => {
    bubble.remove();
  }, totalTime);
}

// Optionally, create bubbles continuously (e.g., one bubble per second)
setInterval(createBubble, 1000);
