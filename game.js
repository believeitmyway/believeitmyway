// Game Configuration
const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;

// Game State
let canvas, ctx;
let snake = [{ x: 10, y: 10 }];
let direction = { x: 1, y: 0 };
let food = { x: 15, y: 15 };
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameRunning = false;
let gameLoop = null;

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    
    document.getElementById('high-score').textContent = highScore;
    
    // Event listeners
    document.addEventListener('keydown', handleKeyPress);
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', startGame);
    
    // Mobile controls
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const dir = btn.getAttribute('data-direction');
            handleDirection(dir);
        });
    });
    
    generateFood();
    draw();
}

// Handle keyboard input
function handleKeyPress(e) {
    if (!gameRunning && e.key !== 'Enter') return;
    
    const keyMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        'w': 'up',
        'W': 'up',
        's': 'down',
        'S': 'down',
        'a': 'left',
        'A': 'left',
        'd': 'right',
        'D': 'right'
    };
    
    if (keyMap[e.key]) {
        e.preventDefault();
        handleDirection(keyMap[e.key]);
    }
}

// Handle direction change
function handleDirection(dir) {
    const directions = {
        'up': { x: 0, y: -1 },
        'down': { x: 0, y: 1 },
        'left': { x: -1, y: 0 },
        'right': { x: 1, y: 0 }
    };
    
    const newDirection = directions[dir];
    
    // Prevent reversing into itself
    if (newDirection.x === -direction.x && newDirection.y === -direction.y) {
        return;
    }
    
    direction = newDirection;
}

// Generate food at random position
function generateFood() {
    food = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
    };
    
    // Make sure food doesn't spawn on snake
    for (let segment of snake) {
        if (segment.x === food.x && segment.y === food.y) {
            generateFood();
            return;
        }
    }
}

// Update game state
function update() {
    if (!gameRunning) return;
    
    // Move snake head
    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };
    
    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        gameOver();
        return;
    }
    
    // Check self collision
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            gameOver();
            return;
        }
    }
    
    snake.unshift(head);
    
    // Check food collision
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        document.getElementById('score').textContent = score;
        generateFood();
    } else {
        snake.pop();
    }
    
    draw();
}

// Draw game
function draw() {
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Draw grid
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
        ctx.stroke();
    }
    
    // Draw snake
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#4ade80' : '#22c55e';
        ctx.fillRect(
            segment.x * CELL_SIZE + 2,
            segment.y * CELL_SIZE + 2,
            CELL_SIZE - 4,
            CELL_SIZE - 4
        );
        
        // Draw eyes on head
        if (index === 0) {
            ctx.fillStyle = '#1a1a2e';
            const eyeSize = 3;
            const eyeOffset = 6;
            
            if (direction.x === 1) { // Right
                ctx.fillRect(segment.x * CELL_SIZE + eyeOffset + 4, segment.y * CELL_SIZE + eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(segment.x * CELL_SIZE + eyeOffset + 4, segment.y * CELL_SIZE + eyeOffset + 8, eyeSize, eyeSize);
            } else if (direction.x === -1) { // Left
                ctx.fillRect(segment.x * CELL_SIZE + eyeOffset, segment.y * CELL_SIZE + eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(segment.x * CELL_SIZE + eyeOffset, segment.y * CELL_SIZE + eyeOffset + 8, eyeSize, eyeSize);
            } else if (direction.y === -1) { // Up
                ctx.fillRect(segment.x * CELL_SIZE + eyeOffset, segment.y * CELL_SIZE + eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(segment.x * CELL_SIZE + eyeOffset + 8, segment.y * CELL_SIZE + eyeOffset, eyeSize, eyeSize);
            } else if (direction.y === 1) { // Down
                ctx.fillRect(segment.x * CELL_SIZE + eyeOffset, segment.y * CELL_SIZE + eyeOffset + 4, eyeSize, eyeSize);
                ctx.fillRect(segment.x * CELL_SIZE + eyeOffset + 8, segment.y * CELL_SIZE + eyeOffset + 4, eyeSize, eyeSize);
            }
        }
    });
    
    // Draw food
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // Draw food shine
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.arc(
        food.x * CELL_SIZE + CELL_SIZE / 2 - 3,
        food.y * CELL_SIZE + CELL_SIZE / 2 - 3,
        4,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

// Start game
function startGame() {
    snake = [{ x: 10, y: 10 }];
    direction = { x: 1, y: 0 };
    score = 0;
    gameRunning = true;
    
    document.getElementById('score').textContent = score;
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOver').classList.add('hidden');
    
    generateFood();
    draw();
    
    if (gameLoop) {
        clearInterval(gameLoop);
    }
    
    gameLoop = setInterval(update, 150);
}

// Game over
function gameOver() {
    gameRunning = false;
    clearInterval(gameLoop);
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        document.getElementById('high-score').textContent = highScore;
    }
    
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.remove('hidden');
}

// Initialize when page loads
window.addEventListener('load', init);
