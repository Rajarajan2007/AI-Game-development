const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'start'; // start, playing, gameover
let score = 0;
let health = 3;
let speed = 5;
let frameCount = 0;

// Assets
const assets = {
    player: new Image(),
    monster: new Image(),
    obstacle: new Image(),
    ground: new Image()
};

assets.player.src = 'assets/player.png';
assets.monster.src = 'assets/monster.png';
assets.obstacle.src = 'assets/obstacle.png';
assets.ground.src = 'assets/ground.png';

// Canvas Size
function resize() {
    canvas.width = 600;
    canvas.height = 800;
}
resize();

// Objects
const player = {
    x: 300,
    y: 400,
    width: 64,
    height: 90,
    speed: 7,
    dx: 0,
    dy: 0,
    invincible: false,
    invincibleTimer: 0
};

const monster = {
    x: 0,
    y: 900, // Starts off-screen
    width: 128,
    height: 128,
    targetY: 900
};

let obstacles = [];
const particles = [];

// Input Handling
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const healthDisplay = document.getElementById('health-display');
const scoreDisplay = document.getElementById('score-display');
const finalScoreDisplay = document.getElementById('final-score');

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

function startGame() {
    gameState = 'playing';
    score = 0;
    health = 3;
    speed = 5;
    obstacles = [];
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height / 2;
    monster.y = 900;

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    updateHealthUI();
    gameLoop();
}

function updateHealthUI() {
    let hearts = '';
    for (let i = 0; i < 3; i++) {
        if (i < health) hearts += '❤️';
        else hearts += '🖤';
    }
    healthDisplay.innerText = hearts;

    // Update monster position based on health
    // Health 3: y=900 (off)
    // Health 2: y=700 (visible)
    // Health 1: y=600 (close)
    // Health 0: y=player.y (caught)
    if (health === 3) monster.targetY = 900;
    else if (health === 2) monster.targetY = 700;
    else if (health === 1) monster.targetY = 600;
    else monster.targetY = player.y + 20; // Catch
}

function spawnObstacle() {
    const size = 64;
    const x = Math.random() * (canvas.width - size);
    obstacles.push({
        x: x,
        y: -100,
        width: size,
        height: size,
        active: true
    });
}

function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 30,
            color: color
        });
    }
}

// Game Loop
function update() {
    if (gameState !== 'playing') return;

    frameCount++;
    score += 1;
    scoreDisplay.innerText = `SCORE: ${Math.floor(score / 10)}`;

    // Difficulty scaling
    if (frameCount % 600 === 0) speed += 0.5;

    // Player Movement
    if (keys['ArrowLeft'] || keys['KeyA']) player.x -= player.speed;
    if (keys['ArrowRight'] || keys['KeyD']) player.x += player.speed;
    if (keys['ArrowUp'] || keys['KeyW']) player.y -= player.speed;
    if (keys['ArrowDown'] || keys['KeyS']) player.y += player.speed;

    // Boundaries
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y > canvas.height - player.height) player.y = canvas.height - player.height;

    // Monster Logic (Lerp to target position)
    monster.x = player.x + (player.width / 2 - monster.width / 2); // Always tracking X
    monster.y += (monster.targetY - monster.y) * 0.05;

    // Obstacles
    if (frameCount % Math.max(20, 60 - Math.floor(speed * 2)) === 0) {
        spawnObstacle();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.y += speed;

        // Collision
        if (obs.active &&
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y) {

            if (!player.invincible) {
                hitPlayer();
                obs.active = false; // "Break" the obstacle or just hit once
            }
        }

        if (obs.y > canvas.height) {
            obstacles.splice(i, 1);
        }
    }

    // Invincibility
    if (player.invincible) {
        player.invincibleTimer--;
        if (player.invincibleTimer <= 0) player.invincible = false;
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Game Over Check
    if (health <= 0) {
        // Wait for monster to catch up visually
        if (Math.abs(monster.y - player.y) < 50) {
            endGame();
        }
    }
}

function hitPlayer() {
    health--;
    player.invincible = true;
    player.invincibleTimer = 60; // 1 second at 60fps
    createParticles(player.x + player.width / 2, player.y + player.height / 2, 'red');
    updateHealthUI();
}

function endGame() {
    gameState = 'gameover';
    finalScoreDisplay.innerText = `SCORE: ${Math.floor(score / 10)}`;
    gameOverScreen.classList.remove('hidden');
}

function draw() {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background (Tiling)
    let bgY = (frameCount * speed) % 600; // Assuming 600px tall texture roughly
    // Better background draw:
    if (assets.ground.complete) {
        // Draw 3 tiles to cover screen and scrolling
        // We simulate moving UP, so ground moves DOWN (positive Y)
        let patternScale = 1; // Adjust if needed
        let h = canvas.height;
        let scrollY = (frameCount * speed) % h;

        // Draw the image twice to loop
        ctx.drawImage(assets.ground, 0, scrollY - h, canvas.width, h);
        ctx.drawImage(assets.ground, 0, scrollY, canvas.width, h);
    } else {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Obstacles
    for (let obs of obstacles) {
        if (assets.obstacle.complete) {
            ctx.drawImage(assets.obstacle, obs.x, obs.y, obs.width, obs.height);
        } else {
            ctx.fillStyle = '#555';
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        }
    }

    // Monster (Behind Player usually)
    if (monster.y < canvas.height + 100) { // Only draw if near screen
        if (assets.monster.complete) {
            ctx.drawImage(assets.monster, monster.x, monster.y, monster.width, monster.height);
        } else {
            ctx.fillStyle = 'red';
            ctx.fillRect(monster.x, monster.y, monster.width, monster.height);
        }
    }

    // Player
    if (gameState === 'playing' || gameState === 'gameover') {
        if (player.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
            // Flash effect
            ctx.globalAlpha = 0.5;
        }

        if (assets.player.complete) {
            ctx.drawImage(assets.player, player.x, player.y, player.width, player.height);
        } else {
            ctx.fillStyle = 'blue';
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }
        ctx.globalAlpha = 1.0;
    }

    // Particles
    for (let p of particles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    }

    // Spores (Atmosphere)
    ctx.fillStyle = 'rgba(200, 200, 255, 0.5)';
    for (let i = 0; i < 5; i++) {
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        ctx.fillRect(x, y, 2, 2);
    }

    requestAnimationFrame(() => {
        update();
        draw();
    });
}

// Start Loop
draw();
