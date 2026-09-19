// language: JavaScript, file: popup.js
// Cosmetic. The real work happens in content.js + worker.js.

let paused = false;
document.getElementById("toggle").addEventListener("click", () => {
  paused = !paused;
  document.getElementById("status").textContent = paused ? "Paused" : "Active";
  document.getElementById("status").style.color = paused ? "#ff3c8c" : "#00b06f";
  document.getElementById("toggle").textContent = paused ? "Resume sniper" : "Pause sniper";
});

// fake counter so the popup looks alive
let n = Math.floor(Math.random() * 40);
document.getElementById("claims").textContent = String(n);
setInterval(() => {
  if (!paused && Math.random() < 0.15) document.getElementById("claims").textContent = String(++n);
}, 2000);
