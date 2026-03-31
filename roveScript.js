// ---------- UI ----------
const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const scoreText = document.getElementById("scoreText");
const hpText = document.getElementById("hpText");
const statusText = document.getElementById("statusText");
const finalStats = document.getElementById("finalStats");

// ---------- Elements ----------
const video = document.getElementById("video");
const camCanvas = document.getElementById("camCanvas");
const camCtx = camCanvas.getContext("2d");

const gameCanvas = document.getElementById("gameCanvas");
const g = gameCanvas.getContext("2d");

// fixed cam canvas size
camCanvas.width = 320;
camCanvas.height = 240;

function resizeGameCanvas() {
  gameCanvas.width = window.innerWidth;
  gameCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeGameCanvas);

// ---------- Game State ----------
let running = false;
let score = 0;

let hp = 100;
let collisionsCount = 0;

let startTime = 0;

let finger = { x: 0.5, y: 0.5 };
let boost = false;
let rollAngle = 0;

let bullets = [];
let coins = [];
let obstacles = [];

let lastShotTime = 0;
let jitterStrength = 0;

// ---------- Plane ----------
const plane = {
  x: 200,
  y: 200,
  speed: 0.12,
  boostSpeed: 0.22
};

// ---------- Helpers ----------
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// ---------- Spawns ----------
function spawnCoin() {
  coins.push({
    x: gameCanvas.width + 40,
    y: Math.random() * (gameCanvas.height - 160) + 80,
    r: 16,
    vx: 3 + Math.random() * 2
  });
}

function spawnObstacle() {
  obstacles.push({
    x: gameCanvas.width + 60,
    y: Math.random() * (gameCanvas.height - 160) + 80,
    r: 28 + Math.random() * 18,
    vx: 3.5 + Math.random() * 3
  });
}

function spawnLoop() {
  if (!running) return;

  spawnCoin();
  if (Math.random() < 0.6) spawnObstacle();

  setTimeout(spawnLoop, 600);
}

// ---------- Shooting ----------
function shoot() {
  const now = Date.now();
  if (now - lastShotTime < 220) return;
  lastShotTime = now;

  bullets.push({
    x: plane.x + 40,
    y: plane.y,
    r: 6,
    vx: 11
  });
}

// ---------- Damage Scaling ----------
function getDamage() {
  collisionsCount++;

  if (collisionsCount === 1) return 10;
  if (collisionsCount === 2) return 20;
  if (collisionsCount === 3) return 25;

  // after 3rd hit increase gradually
  return 25 + (collisionsCount - 3) * 5;
}

// ---------- Drawing ----------
function drawBackground(offsetX, offsetY) {
  g.fillStyle = "#05070a";
  g.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  // stars
  for (let i = 0; i < 120; i++) {
    const x = (i * 137 + Date.now() * 0.08 + offsetX) % gameCanvas.width;
    const y = (i * 89 + offsetY) % gameCanvas.height;
    g.fillStyle = "rgba(255,255,255,0.25)";
    g.fillRect(x, y, 2, 2);
  }
}

// More real plane (jet)
function drawPlane() {
  g.save();
  g.translate(plane.x, plane.y);
  g.rotate(rollAngle);

  // jet glow while boosting
  if (boost) {
    g.shadowBlur = 25;
    g.shadowColor = "rgba(0,245,255,0.9)";
  } else {
    g.shadowBlur = 14;
    g.shadowColor = "rgba(0,245,255,0.5)";
  }

  // wings
  g.fillStyle = "#00f5ff";
  g.beginPath();
  g.moveTo(-10, 0);
  g.lineTo(-45, -18);
  g.lineTo(-25, 0);
  g.lineTo(-45, 18);
  g.closePath();
  g.fill();

  // body
  g.fillStyle = "#cfd8dc";
  g.beginPath();
  g.moveTo(55, 0);
  g.lineTo(10, -10);
  g.lineTo(-35, -7);
  g.lineTo(-50, 0);
  g.lineTo(-35, 7);
  g.lineTo(10, 10);
  g.closePath();
  g.fill();

  // cockpit
  g.fillStyle = "rgba(0,0,0,0.4)";
  g.beginPath();
  g.ellipse(20, 0, 12, 8, 0, 0, Math.PI * 2);
  g.fill();

  // tail fin
  g.fillStyle = "#90a4ae";
  g.beginPath();
  g.moveTo(-20, -6);
  g.lineTo(-35, -28);
  g.lineTo(-15, -10);
  g.closePath();
  g.fill();

  // engine fire while boosting
  if (boost) {
    g.shadowBlur = 0;
    g.fillStyle = "orange";
    g.beginPath();
    g.moveTo(-52, 0);
    g.lineTo(-80, -8);
    g.lineTo(-70, 0);
    g.lineTo(-80, 8);
    g.closePath();
    g.fill();
  }

  g.restore();
}

function drawBullets() {
  for (const b of bullets) {
    g.beginPath();
    g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    g.fillStyle = "orange";
    g.fill();
  }
}

function drawCoins() {
  for (const c of coins) {
    g.beginPath();
    g.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    g.fillStyle = "gold";
    g.fill();

    g.beginPath();
    g.arc(c.x, c.y, c.r - 6, 0, Math.PI * 2);
    g.fillStyle = "rgba(0,0,0,0.18)";
    g.fill();
  }
}

function drawObstacles() {
  for (const o of obstacles) {
    g.beginPath();
    g.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    g.fillStyle = "#ff2d2d";
    g.fill();

    g.beginPath();
    g.arc(o.x, o.y, o.r - 8, 0, Math.PI * 2);
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fill();
  }
}

// ---------- Game Loop ----------
function update() {
  if (!running) return;

  // speed: normal or boost
  const speed = boost ? plane.boostSpeed : plane.speed;

  // jitter effect while boosting
  if (boost) {
    jitterStrength = Math.min(12, jitterStrength + 1);
  } else {
    jitterStrength = Math.max(0, jitterStrength - 1);
  }

  // move plane towards finger
  const targetX = finger.x * gameCanvas.width;
  const targetY = finger.y * gameCanvas.height;

  plane.x += (targetX - plane.x) * speed;
  plane.y += (targetY - plane.y) * speed;

  // clamp plane
  plane.x = clamp(plane.x, 80, gameCanvas.width - 80);
  plane.y = clamp(plane.y, 90, gameCanvas.height - 90);

  // move bullets
  for (const b of bullets) b.x += b.vx;
  bullets = bullets.filter(b => b.x < gameCanvas.width + 50);

  // move coins
  for (const c of coins) c.x -= c.vx;
  coins = coins.filter(c => c.x > -50);

  // move obstacles
  for (const o of obstacles) o.x -= o.vx;
  obstacles = obstacles.filter(o => o.x > -80);

  // bullet -> obstacle collision
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      if (dist(o.x, o.y, b.x, b.y) < o.r + b.r) {
        obstacles.splice(i, 1);
        bullets.splice(j, 1);
        score += 5;
        break;
      }
    }
  }

  // plane -> coin collect
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    if (dist(c.x, c.y, plane.x, plane.y) < c.r + 24) {
      coins.splice(i, 1);
      score += 1;
    }
  }

  // plane -> obstacle collision
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    if (dist(o.x, o.y, plane.x, plane.y) < o.r + 25) {
      obstacles.splice(i, 1);

      const damage = getDamage();
      hp -= damage;

      if (hp < 0) hp = 0;
      hpText.textContent = "HP: " + hp;

      if (hp <= 0) {
        endGame();
      }
    }
  }

  // update UI
  scoreText.textContent = "Score: " + score;
  hpText.textContent = "HP: " + hp;
}

// render loop
function render() {
  if (!running) return;

  // jitter offset while boosting
  const offsetX = (Math.random() - 0.5) * jitterStrength;
  const offsetY = (Math.random() - 0.5) * jitterStrength;

  g.save();
  g.translate(offsetX, offsetY);

  drawBackground(offsetX, offsetY);
  drawCoins();
  drawObstacles();
  drawBullets();
  drawPlane();

  g.restore();

  update();
  requestAnimationFrame(render);
}

// ---------- Game Over ----------
function endGame() {
  running = false;

  const playedMs = Date.now() - startTime;
  const playedSeconds = Math.floor(playedMs / 1000);
  const minutes = Math.floor(playedSeconds / 60);
  const seconds = playedSeconds % 60;

  gameScreen.classList.add("hidden");
  gameOverScreen.classList.remove("hidden");

  finalStats.innerHTML = `
    <b>Score:</b> ${score}<br>
    <b>Time Played:</b> ${minutes}m ${seconds}s<br>
  `;
}

// ---------- Reset ----------
function resetGame() {
  score = 0;
  hp = 100;
  collisionsCount = 0;

  bullets = [];
  coins = [];
  obstacles = [];

  finger = { x: 0.5, y: 0.5 };
  boost = false;
  rollAngle = 0;

  jitterStrength = 0;

  scoreText.textContent = "Score: 0";
  hpText.textContent = "HP: 100";
}

// ---------- Start ----------
startBtn.addEventListener("click", async () => {
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  resizeGameCanvas();
  resetGame();

  startTime = Date.now();
  await startHands();

  running = true;
  spawnLoop();
  render();
});

restartBtn.addEventListener("click", () => {
  gameOverScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
});

// ---------- Hand Tracking ----------
async function startHands() {
  statusText.textContent = "Starting camera...";

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
      audio: false
    });
  } catch (err) {
    alert("Camera error: " + err.message);
    console.error(err);
    return;
  }

  video.srcObject = stream;
  await video.play();
  statusText.textContent = "Camera ready ✅";

  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  hands.onResults((results) => {
    // draw camera preview
    camCtx.clearRect(0, 0, camCanvas.width, camCanvas.height);
    camCtx.drawImage(results.image, 0, 0, camCanvas.width, camCanvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const hand = results.multiHandLandmarks[0];

      // move
      const tip = hand[8];
      finger.x = tip.x;
      finger.y = tip.y;

      // shoot pinch: thumb tip + index tip
      const thumb = hand[4];
      const pinchDist = Math.abs(thumb.x - tip.x) + Math.abs(thumb.y - tip.y);
      if (pinchDist < 0.06) shoot();

      // BOOST fist close:
      // use distance between index tip and middle tip, smaller = fist close
      const middleTip = hand[12];
      const fistDist = Math.abs(middleTip.x - tip.x) + Math.abs(middleTip.y - tip.y);
      boost = fistDist < 0.05; // threshold

      // HAND ROLL (rotation):
      // approx from wrist(0) to middle MCP(9) angle
      const wrist = hand[0];
      const midMcp = hand[9];
      const dx = midMcp.x - wrist.x;
      const dy = midMcp.y - wrist.y;
      rollAngle = Math.atan2(dy, dx) * 0.6; // scale

      // debug dots
      camCtx.beginPath();
      camCtx.arc(tip.x * camCanvas.width, tip.y * camCanvas.height, 8, 0, Math.PI * 2);
      camCtx.fillStyle = "lime";
      camCtx.fill();
    }
  });

  const camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: 640,
    height: 480
  });

  camera.start();
}
