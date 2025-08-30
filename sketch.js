let player;
let trackSegments = [];
let obstacles = [];
let particles = [];
let score = 0;
let speed = 0;
let baseSpeed = 0.8; // Faster start but still manageable
let gravity = 0.015; // Slightly more acceleration
let easyModeTime = 20 * 60; // 20 seconds at 60fps
let friction = 0.02;
let gameOver = false;
let showingEmailInput = false;
let showingLeaderboard = false;
let submissionError = '';
let bgGraphics; // For parallax background
let sledSprite; // Player asset
let noiseOffset = 0;

// Mobile touch controls
let touchControls = {
  left: false,
  right: false,
  up: false,
  down: false
};

function setup() {
  // Mobile-responsive canvas size
  let canvasWidth = min(400, windowWidth - 20);
  let canvasHeight = min(600, windowHeight - 20);
  createCanvas(canvasWidth, canvasHeight);
  noSmooth(); // For retro pixel look
  frameRate(60);
  
  // Create background graphics (mountains, trees) - double height for seamless scrolling
  bgGraphics = createGraphics(width, height * 2);
  drawBackground(bgGraphics);
  
  // Create player sled sprite
  sledSprite = createGraphics(16, 24); // Low-res for retro
  drawSled(sledSprite);
  
  // Initialize player
  player = { x: width / 2, y: height / 2, w: 16, h: 24, steer: 0 };
  
  // Generate initial track
  generateTrack(20); // More segments for start
  
  // Add initial obstacles safely
  if (trackSegments.length > 10) {
    for (let i = 8; i < trackSegments.length - 8; i += 6) {
      try {
        let segment = trackSegments[i];
        if (segment && !isNaN(segment.x) && !isNaN(segment.y)) {
          let obstacleX = segment.x + random(-25, 25);
          obstacleX = constrain(obstacleX, segment.x - 40, segment.x + 40);
          
          obstacles.push({ 
            x: obstacleX,
            y: segment.y, 
            w: 12, 
            h: 20 
          });
        }
      } catch (error) {
        console.error('Error creating initial obstacle:', error);
      }
    }
  }
  
  // Fetch initial leaderboard
  leaderboard.fetchLeaderboard();
}

function draw() {
  background(100, 150, 200); // Sky blue
  
  // Parallax scroll background slower
  let bgOffset = (frameCount * speed * 0.5) % (height * 2);
  image(bgGraphics, 0, -bgOffset);
  image(bgGraphics, 0, -bgOffset + height * 2);
  
  // Calculate world offset
  let offset = frameCount * speed;
  
  // Draw track with scroll
  push();
  translate(0, -offset);
  drawTrack();
  pop();
  
  // Update player if not game over
  if (!gameOver) {
    // Toddler-friendly progression: easy for 40s, then ramp up
    let timeElapsed = frameCount;
    let targetSpeed;
    
    if (timeElapsed < easyModeTime) {
      // Easy mode: manageable speed with gentle ramp
      targetSpeed = baseSpeed + (timeElapsed / easyModeTime) * 0.5; // Slowly builds to 1.3
      gravity = 0.01; // Gentle acceleration
    } else {
      // Hard mode kicks in after 40 seconds
      let hardModeTime = timeElapsed - easyModeTime;
      targetSpeed = 1.3 + (hardModeTime / 300) * 4; // Rapid acceleration from 1.3
      gravity = 0.04; // Much faster acceleration
    }
    
    speed += gravity;
    speed = constrain(speed, 0, targetSpeed);
    score += 1;
    
    // Steering controls - slower movement (keyboard + touch)
    if (keyIsDown(LEFT_ARROW) || touchControls.left) player.steer = -1;
    else if (keyIsDown(RIGHT_ARROW) || touchControls.right) player.steer = 1;
    else player.steer *= 0.9; // Dampen steering
    player.x += player.steer;
    player.x = constrain(player.x, 0, width);
    
    // Brake and boost (keyboard + touch)
    if (keyIsDown(DOWN_ARROW) || touchControls.down) speed -= friction;
    if (keyIsDown(UP_ARROW) || touchControls.up) speed += 0.1; // Risky boost
    
    // Check collisions
    checkCollisions(offset);
  }
  
  // Draw player at fixed position
  image(sledSprite, player.x - player.w / 2, player.y - player.h / 2);
  
  // Draw obstacles with scroll
  for (let obs of obstacles) {
    let obsScreenY = obs.y - offset;
    if (obsScreenY > -50 && obsScreenY < height + 50) { // Only draw if visible
      push();
      translate(0, -offset);
      drawObstacle(obs.x, obs.y);
      pop();
    }
  }
  
  // Update and draw particles
  updateParticles();
  
  // Visual UI in top right
  let timeElapsed = frameCount;
  let survivedSeconds = Math.floor(score / 60);
  let timeLeft = timeElapsed < easyModeTime ? Math.ceil((easyModeTime - timeElapsed) / 60) : 0;
  
  // Score panel background
  fill(0, 0, 0, 150);
  stroke(255, 255, 255, 200);
  strokeWeight(2);
  rect(width - 200, 10, 190, timeLeft > 0 ? 120 : 100, 8);
  noStroke();
  
  // Score display
  fill(255, 255, 0);
  textAlign(RIGHT);
  textSize(20);
  text(`⏱️ ${survivedSeconds}s`, width - 20, 35);
  
  fill(255);
  textSize(14);
  text(`Score: ${floor(score)}`, width - 20, 55);
  
  // Mode indicator with progress bar and warnings
  if (timeLeft > 0) {
    // Warning system as hard mode approaches
    let warningColor = color(100, 255, 100);
    let modeText = "🟢 EASY MODE";
    
    if (timeLeft <= 10) {
      // Final 10 seconds - red flashing warning
      let flashIntensity = map(sin(frameCount * 0.8), -1, 1, 100, 255);
      warningColor = color(255, flashIntensity, flashIntensity);
      modeText = "⚠️ DANGER ZONE!";
    } else if (timeLeft <= 15) {
      // Final 15 seconds - orange warning
      warningColor = color(255, 200, 0);
      modeText = "⚡ WARNING!";
    }
    
    fill(warningColor);
    textSize(14);
    text(modeText, width - 20, 75);
    
    // Progress bar background
    fill(50, 50, 50);
    rect(width - 180, 80, 160, 8, 4);
    
    // Progress bar fill with warning colors
    let progress = map(20 - timeLeft, 0, 20, 0, 160);
    if (timeLeft <= 10) {
      fill(255, 50, 50); // Red in danger zone
    } else if (timeLeft <= 15) {
      fill(255, 200, 0); // Orange in warning
    } else {
      fill(100, 255, 100); // Green in safe zone
    }
    rect(width - 180, 80, progress, 8, 4);
    
    // Time left with dramatic styling
    if (timeLeft <= 10) {
      fill(255, 255, 255);
      textSize(14);
      text(`💀 ${timeLeft}s TO CHAOS!`, width - 20, 105);
    } else if (timeLeft <= 15) {
      fill(255, 200, 0);
      textSize(12);
      text(`⚡ ${timeLeft}s until HARD MODE!`, width - 20, 105);
    } else {
      fill(255, 100, 100);
      textSize(12);
      text(`${timeLeft}s until HARD MODE`, width - 20, 105);
    }
  } else {
    // Hard mode indicator
    fill(255, 100, 100);
    textSize(14);
    text(`🔴 HARD MODE`, width - 20, 75);
    
    // Speed meter
    fill(255);
    textSize(12);
    text(`Speed: ${speed.toFixed(1)}`, width - 20, 95);
    
    // Speed bar
    fill(50, 50, 50);
    rect(width - 180, 100, 160, 6, 3);
    
    let speedProgress = map(speed, 0, 8, 0, 160);
    fill(255, 100, 100);
    rect(width - 180, 100, speedProgress, 6, 3);
  }
  
  // Bottom branding
  textAlign(LEFT);
  fill(255, 200);
  textSize(12);
  text(`🚗 AI Mountain Racer - Built with p5.js`, 10, height - 10);
  
  // Mobile touch controls UI
  drawTouchControls();
  
  // Handle different game states
  if (showingLeaderboard) {
    leaderboard.drawLeaderboard();
  } else if (showingEmailInput) {
    drawEmailInputScreen();
  } else if (gameOver) {
    // Animated crash screen overlay
    let crashTime = frameCount - (score + 1); // Time since crash
    
    // Dark overlay with fade-in
    let overlayAlpha = map(crashTime, 0, 60, 0, 180);
    overlayAlpha = constrain(overlayAlpha, 0, 180);
    fill(0, overlayAlpha);
    rect(0, 0, width, height);
    
    // Pulsing crash title
    let pulseSize = 1 + sin(frameCount * 0.2) * 0.1;
    textAlign(CENTER);
    
    // Red glow effect for crash title
    for (let i = 0; i < 3; i++) {
      fill(255, 0, 0, 100 - i * 30);
      textSize((28 + i * 2) * pulseSize);
      text('💥 CRASHED! 💥', width / 2, height / 2 - 80);
    }
    
    // Main crash title
    fill(255, 255, 0); // Bright yellow
    textSize(28 * pulseSize);
    text('💥 CRASHED! 💥', width / 2, height / 2 - 80);
    
    // Stats box background
    fill(50, 50, 80, 200);
    stroke(255, 255, 0);
    strokeWeight(2);
    rect(width / 2 - 150, height / 2 - 40, 300, 120, 10);
    noStroke();
    
    // Stats content
    fill(255);
    textSize(18);
    let finalTime = Math.floor(score / 60);
    let achievement = finalTime < 40 ? "🍼 Toddler Driver" : 
                     finalTime < 60 ? "🚗 Getting Good" :
                     finalTime < 120 ? "🏎️ Speed Demon" : "🏆 AI Racing Legend";
    
    text(`Survival Time: ${finalTime} seconds`, width / 2, height / 2 - 10);
    
    // Achievement with color coding
    if (finalTime >= 120) fill(255, 215, 0); // Gold
    else if (finalTime >= 60) fill(255, 100, 255); // Purple  
    else if (finalTime >= 40) fill(0, 255, 100); // Green
    else fill(255, 255, 255); // White
    
    textSize(20);
    text(achievement, width / 2, height / 2 + 15);
    
    // Separator line
    stroke(100, 200, 255);
    strokeWeight(2);
    line(width / 2 - 100, height / 2 + 50, width / 2 + 100, height / 2 + 50);
    noStroke();
    
    // Animated restart prompt (smaller and less prominent)
    let blinkAlpha = map(sin(frameCount * 0.15), -1, 1, 150, 255);
    fill(255, blinkAlpha);
    textSize(14);
    text('SPACE: Quick Restart', width / 2, height / 2 + 135);
    
    // Clear leaderboard call-to-action with better visual hierarchy
    fill(255, 255, 0);
    textSize(20);
    text('📧 SAVE TO LEADERBOARD', width / 2, height / 2 + 75);
    
    // Animated enter prompt (main action)
    let enterAlpha = map(sin(frameCount * 0.2), -1, 1, 200, 255);
    fill(100, 255, 100, enterAlpha);
    textSize(18);
    text('🎯 Press ENTER to compete!', width / 2, height / 2 + 100);
    
    // Box around main action
    noFill();
    stroke(100, 255, 100, enterAlpha);
    strokeWeight(2);
    rect(width / 2 - 120, height / 2 + 83, 240, 25, 5);
    noStroke();
    
    // Mobile touch buttons for crash screen
    drawCrashTouchButtons();
  }
  
  // More robust track generation
  let needsMoreTrack = trackSegments.length < 40;
  if (trackSegments.length > 0) {
    let lastSegment = trackSegments[trackSegments.length - 1];
    needsMoreTrack = needsMoreTrack || (lastSegment.y - offset < height * 4);
  }
  
  if (needsMoreTrack && !gameOver) {
    try {
      generateTrack(20); // Generate more segments for safety
    } catch (error) {
      console.error('Track generation error:', error);
      // Emergency track generation
      if (trackSegments.length === 0) {
        trackSegments.push({ x: width / 2, y: 0, w: 120 });
      }
    }
  }
  
  // Safer obstacle generation
  let obstacleRate = timeElapsed < easyModeTime ? 360 : 240; // Slower spawn rate
  if (frameCount % obstacleRate === 0 && !gameOver && trackSegments.length > 20) {
    try {
      let safeIndex = Math.max(10, trackSegments.length - 10);
      if (safeIndex < trackSegments.length && trackSegments[safeIndex]) {
        let segment = trackSegments[safeIndex];
        // Ensure obstacle stays well within track bounds
        let obstacleX = segment.x + random(-35, 35);
        obstacleX = constrain(obstacleX, segment.x - 50, segment.x + 50);
        
        obstacles.push({ 
          x: obstacleX,
          y: segment.y, 
          w: 12, 
          h: 20 
        });
      }
    } catch (error) {
      console.error('Obstacle generation error:', error);
    }
  }
  
  // More efficient and safe pruning
  let pruneCount = 0;
  while (trackSegments.length > 50 && pruneCount < 3) {
    if (trackSegments.length > 0 && trackSegments[0] && trackSegments[0].y - offset < -300) {
      trackSegments.shift();
      pruneCount++;
    } else {
      break;
    }
  }
  
  // Prune obstacles more efficiently with error handling
  if (frameCount % 60 === 0) { // Only every second
    try {
      obstacles = obstacles.filter(obs => {
        return obs && !isNaN(obs.y) && obs.y - offset > -200;
      });
    } catch (error) {
      console.error('Error pruning obstacles:', error);
      obstacles = []; // Reset obstacles if there's an error
    }
  }
}

function keyPressed() {
  if (showingLeaderboard) {
    if (key === ' ') {
      showingLeaderboard = false;
      resetGame();
    }
  } else if (showingEmailInput) {
    let shouldSubmit = leaderboard.handleKeyInput(key, keyCode);
    if (shouldSubmit) {
      submitToLeaderboard();
    }
  } else if (gameOver) {
    if (key === ' ') {
    resetGame();
    } else if (keyCode === ENTER) {
      showEmailInput();
    }
  }
}

function keyTyped() {
  // Handle additional key input for email
  if (showingEmailInput) {
    return false; // Prevent default
  }
}

function drawBackground(g) {
  g.noStroke();
  // Gradient sky for more visual appeal
  for (let i = 0; i <= height; i++) {
    let inter = map(i, 0, height, 0, 1);
    let c = lerpColor(color(135, 206, 235), color(255, 182, 193), inter);
    g.stroke(c);
    g.line(0, i, width, i);
  }
  
  // Mountains with gradient
  g.fill(100, 150, 100, 180);
  g.triangle(0, height, width / 2, height / 2, width, height);
  g.fill(80, 120, 80, 180);
  g.triangle(width / 4, height, width / 2 + 50, height / 3, width, height);
  
  // Trees with more variety
  for (let i = 0; i < 40; i++) {
    let tx = random(width);
    let ty = random(height * 2);
    g.fill(139, 69, 19); // Brown trunk
    g.rect(tx - 5, ty, 10, 20);
    g.fill(34, 139, 34); // Forest green
    g.ellipse(tx, ty - 10, 20, 25); // Round tree top
  }
}

function drawSled(g) {
  g.noStroke();
  g.fill(0, 200, 255); // Blue body
  g.rect(2, 4, 12, 16);
  g.fill(255, 0, 0); // Red accents
  g.rect(4, 6, 8, 4);
  g.fill(50); // Wheels/skis
  g.ellipse(4, 20, 4, 4);
  g.ellipse(12, 20, 4, 4);
}

function generateTrack(numSegments) {
  if (numSegments <= 0 || numSegments > 100) return; // Safety bounds
  
  let lastY = trackSegments.length > 0 ? trackSegments[trackSegments.length - 1].y : 0;
  let lastX = trackSegments.length > 0 ? trackSegments[trackSegments.length - 1].x : width / 2;
  
  // Ensure lastX is valid
  if (isNaN(lastX) || lastX < 0 || lastX > width) {
    lastX = width / 2;
  }
  
  for (let i = 0; i < numSegments; i++) {
    try {
      // Smoother curve generation with bounds checking
      let targetX = noise(noiseOffset) * width * 0.4 + width * 0.3;
      
      // Ensure target is within reasonable bounds
      targetX = constrain(targetX, width * 0.2, width * 0.8);
      
      // Smooth transitions with safety checks
      let curve = lerp(lastX, targetX, 0.3);
      curve = constrain(curve, width * 0.1, width * 0.9); // Hard bounds
      
      // Validate the segment before adding
      if (!isNaN(curve) && curve >= 0 && curve <= width) {
        trackSegments.push({ 
          x: curve, 
          y: lastY + 50, 
          w: 120 
        });
        lastY += 50;
        lastX = curve;
      } else {
        // Fallback to safe position
        trackSegments.push({ 
          x: width / 2, 
          y: lastY + 50, 
          w: 120 
        });
        lastY += 50;
        lastX = width / 2;
      }
      
      noiseOffset += 0.05; // Slower noise progression
    } catch (error) {
      console.error('Error generating track segment:', error);
      // Emergency fallback
      trackSegments.push({ 
        x: width / 2, 
        y: lastY + 50, 
        w: 120 
      });
      lastY += 50;
    }
  }
}

function drawTrack() {
  noFill();
  stroke(200); // Track color
  strokeWeight(120); // Match collision zone width
  beginShape();
  for (let seg of trackSegments) {
    curveVertex(seg.x, seg.y);
  }
  endShape();
  
  // Draw clear edge lines that match collision boundaries
  stroke(100); // Darker edge lines
  strokeWeight(3);
  beginShape();
  noFill();
  for (let seg of trackSegments) {
    curveVertex(seg.x - seg.w / 2, seg.y); // Left edge
  }
  endShape();
  
  beginShape();
  for (let seg of trackSegments) {
    curveVertex(seg.x + seg.w / 2, seg.y); // Right edge
  }
  endShape();
}

function drawObstacle(x, y) {
  noStroke();
  fill(255, 100, 0); // Orange body
  rect(x - 6, y - 10, 12, 20);
  fill(50); // Wheels
  ellipse(x - 4, y + 5, 4, 4);
  ellipse(x + 4, y + 5, 4, 4);
}

function checkCollisions(offset) {
  try {
    // Calculate player's world Y with safety checks
    let worldY = offset + player.y;
    if (isNaN(worldY)) return;
    
    // Find closest segment index with comprehensive bounds checking
    let index = floor(worldY / 50);
    if (index < 0) index = 0;
    
    // Ensure we have track segments
    if (trackSegments.length === 0) {
      generateTrack(20);
      return;
    }
    
    if (index >= trackSegments.length) {
      // Emergency track generation if we're ahead
      generateTrack(20);
      index = Math.min(index, trackSegments.length - 1);
    }
    
    let closestSeg = trackSegments[index];
    if (!closestSeg || isNaN(closestSeg.x) || isNaN(closestSeg.w)) {
      // Regenerate corrupted segment
      trackSegments[index] = { x: width / 2, y: index * 50, w: 120 };
      closestSeg = trackSegments[index];
    }
    
    // Check track edges with validated values
    let trackLeft = closestSeg.x - closestSeg.w / 2;
    let trackRight = closestSeg.x + closestSeg.w / 2;
    let playerLeft = player.x - player.w / 2;
    let playerRight = player.x + player.w / 2;
    
    // Ensure all values are valid before collision check
    if (!isNaN(trackLeft) && !isNaN(trackRight) && !isNaN(playerLeft) && !isNaN(playerRight)) {
      if (playerRight < trackLeft || playerLeft > trackRight) {
        crash();
        return;
      }
    }
    
    // Check obstacles with error handling
    for (let i = obstacles.length - 1; i >= 0; i--) {
      try {
        let obs = obstacles[i];
        if (!obs || isNaN(obs.x) || isNaN(obs.y)) {
          obstacles.splice(i, 1); // Remove invalid obstacle
          continue;
        }
        
        let dy = abs(obs.y - worldY);
        
        // Quick distance check first
        if (dy > 50) continue;
        
        let dx = abs(obs.x - player.x);
        // Smaller collision boxes for fairer gameplay
        if (dy < (player.h + obs.h) / 2.5 && dx < (player.w + obs.w) / 2.5) {
          crash();
          break;
        }
      } catch (error) {
        console.error('Error checking obstacle collision:', error);
        obstacles.splice(i, 1); // Remove problematic obstacle
      }
    }
  } catch (error) {
    console.error('Collision detection error:', error);
  }
}

function crash() {
  if (gameOver) return;
  gameOver = true;
  speed = 0;
  // Create particles
  for (let i = 0; i < 50; i++) {
    particles.push({ x: player.x, y: player.y, vx: random(-2, 2), vy: random(-5, 0), life: 60 });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    fill(255, 200, 0, p.life * 4);
    noStroke();
    ellipse(p.x, p.y, 4);
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1; // Gravity on particles
    p.life--;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function resetGame() {
  score = 0;
  speed = baseSpeed;
  gameOver = false;
  showingEmailInput = false;
  showingLeaderboard = false;
  submissionError = '';
  leaderboard.emailInput = '';
  trackSegments = [];
  obstacles = [];
  particles = [];
  noiseOffset = 0;
  generateTrack(20);
  if (trackSegments.length > 10) {
    for (let i = 8; i < trackSegments.length - 8; i += 6) {
      try {
        let segment = trackSegments[i];
        if (segment && !isNaN(segment.x) && !isNaN(segment.y)) {
          let obstacleX = segment.x + random(-25, 25);
          obstacleX = constrain(obstacleX, segment.x - 40, segment.x + 40);
          
          obstacles.push({ 
            x: obstacleX,
            y: segment.y, 
            w: 12, 
            h: 20 
          });
        }
      } catch (error) {
        console.error('Error creating reset obstacle:', error);
      }
    }
  }
  player.x = width / 2;
  player.steer = 0;
}

function showEmailInput() {
  showingEmailInput = true;
  leaderboard.emailInput = '';
  submissionError = '';
}

function drawEmailInputScreen() {
  // Dark overlay
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);
  
  // Main panel
  fill(30, 30, 50, 240);
  stroke(100, 200, 255);
  strokeWeight(3);
  rect(50, 150, width - 100, 300, 10);
  noStroke();
  
  // Title
  fill(255, 215, 0);
  textAlign(CENTER);
  textSize(24);
  text('🏆 SAVE YOUR SCORE! 🏆', width/2, 190);
  
  // Final stats
  fill(255);
  textSize(16);
  let finalTime = Math.floor(score / 60);
  let achievement = leaderboard.getAchievement(finalTime);
  text(`You survived ${finalTime} seconds!`, width/2, 220);
  text(`Score: ${Math.floor(score)}`, width/2, 245);
  
  fill(255, 215, 0);
  textSize(18);
  text(achievement, width/2, 270);
  
  // Email input label
  fill(255);
  textSize(14);
  text('Enter your email to join the leaderboard:', width/2, 310);
  
  // Email input box with mobile keyboard
  drawMobileEmailInput();
  
  // Error message
  if (submissionError) {
    fill(255, 100, 100);
    textSize(12);
    text(submissionError, width/2, 370);
  }
  
  // Instructions with better contrast
  fill(100, 255, 100);
  textSize(16);
  text('Press ENTER to submit', width/2, 380);
  
  fill(255, 100, 100);
  textSize(12);
  text('or SPACE to skip', width/2, 400);
  
  // Loading indicator
  if (leaderboard.isSubmitting) {
    fill(100, 200, 255);
    textSize(14);
    text('Submitting...', width/2, 420);
  }
  
  // Mobile touch buttons for email input
  drawEmailTouchButtons();
}

async function submitToLeaderboard() {
  if (leaderboard.isSubmitting) return;
  
  const email = leaderboard.emailInput.trim();
  if (!email) {
    submissionError = 'Please enter your email';
    return;
  }
  
  if (!leaderboard.validateEmail(email)) {
    submissionError = 'Please enter a valid email';
    return;
  }
  
  try {
    const finalTime = Math.floor(score / 60);
    const achievement = leaderboard.getAchievement(finalTime);
    
    await leaderboard.submitScore(email, score, finalTime, achievement);
    
    // Success - show leaderboard
    showingEmailInput = false;
    showingLeaderboard = true;
    submissionError = '';
  } catch (error) {
    submissionError = error.message || 'Failed to submit score';
  }
}

// Mobile touch controls
function drawTouchControls() {
  // Only show on mobile or when game is active
  if (!gameOver && !showingEmailInput && !showingLeaderboard) {
    let buttonSize = 60;
    let margin = 20;
    
    // Left/Right steering buttons
    drawTouchButton(margin, height - buttonSize - margin, buttonSize, "←", touchControls.left);
    drawTouchButton(margin + buttonSize + 10, height - buttonSize - margin, buttonSize, "→", touchControls.right);
    
    // Up/Down buttons on right side
    drawTouchButton(width - buttonSize - margin, height - buttonSize * 2 - margin - 10, buttonSize, "↑", touchControls.up);
    drawTouchButton(width - buttonSize - margin, height - buttonSize - margin, buttonSize, "↓", touchControls.down);
  }
}

function drawTouchButton(x, y, size, label, isPressed) {
  // Button background
  fill(isPressed ? 100 : 50, isPressed ? 150 : 100, isPressed ? 255 : 150, 150);
  stroke(255, 100);
  strokeWeight(2);
  rect(x, y, size, size, 10);
  
  // Button label
  fill(255);
  textAlign(CENTER);
  textSize(24);
  text(label, x + size/2, y + size/2 + 8);
  noStroke();
}

function touchStarted() {
  handleTouch(true);
  return false; // Prevent default
}

function touchEnded() {
  handleTouch(false);
  return false; // Prevent default
}

function handleTouch(isPressed) {
  if (touches.length === 0 && !isPressed) {
    // No touches, reset all
    touchControls.left = false;
    touchControls.right = false;
    touchControls.up = false;
    touchControls.down = false;
    return;
  }
  
  // Handle menu touches
  if (isPressed && touches.length > 0) {
    let touch = touches[0];
    let tx = touch.x;
    let ty = touch.y;
    
    // Crash screen touches
    if (gameOver && !showingEmailInput && !showingLeaderboard) {
      // "Save to Leaderboard" button (main green box area)
      if (tx > width/2 - 120 && tx < width/2 + 120 && ty > height/2 + 70 && ty < height/2 + 110) {
        showEmailInput();
        return;
      }
      // "Restart" button area
      if (tx > width/2 - 80 && tx < width/2 + 80 && ty > height/2 + 125 && ty < height/2 + 145) {
        resetGame();
        return;
      }
    }
    
    // Email input screen touches
    if (showingEmailInput) {
      // Email input box or mobile keyboard button
      if ((tx > width/2 - 120 && tx < width/2 + 120 && ty > 320 && ty < 355) ||
          (tx > width/2 - 60 && tx < width/2 + 60 && ty > 365 && ty < 390)) {
        openMobileKeyboard();
        return;
      }
      // Submit button
      if (tx > width/2 - 100 && tx < width/2 + 100 && ty > height/2 + 160 && ty < height/2 + 190) {
        submitToLeaderboard();
        return;
      }
      // Skip button
      if (tx > width/2 - 60 && tx < width/2 + 60 && ty > height/2 + 200 && ty < height/2 + 220) {
        showingEmailInput = false;
        resetGame();
        return;
      }
    }
    
    // Leaderboard screen touches
    if (showingLeaderboard) {
      // Play again
      if (tx > width/2 - 100 && tx < width/2 + 100 && ty > height - 70 && ty < height - 40) {
        showingLeaderboard = false;
        resetGame();
        return;
      }
    }
  }
  
  // Game control touches (only during gameplay)
  if (!gameOver && !showingEmailInput && !showingLeaderboard) {
    if (touches.length === 0 && !isPressed) {
      touchControls.left = false;
      touchControls.right = false;
      touchControls.up = false;
      touchControls.down = false;
      return;
    }
    
    let buttonSize = 60;
    let margin = 20;
    
    // Check each touch point for game controls
    for (let touch of touches) {
      let tx = touch.x;
      let ty = touch.y;
      
      // Left button
      if (tx > margin && tx < margin + buttonSize && 
          ty > height - buttonSize - margin && ty < height - margin) {
        touchControls.left = isPressed;
      }
      // Right button
      else if (tx > margin + buttonSize + 10 && tx < margin + buttonSize * 2 + 10 && 
               ty > height - buttonSize - margin && ty < height - margin) {
        touchControls.right = isPressed;
      }
      // Up button
      else if (tx > width - buttonSize - margin && tx < width - margin && 
               ty > height - buttonSize * 2 - margin - 10 && ty < height - buttonSize - margin - 10) {
        touchControls.up = isPressed;
      }
      // Down button
      else if (tx > width - buttonSize - margin && tx < width - margin && 
               ty > height - buttonSize - margin && ty < height - margin) {
        touchControls.down = isPressed;
      }
    }
  }
}

function drawCrashTouchButtons() {
  // Submit to leaderboard button (bigger and more obvious)
  fill(100, 255, 100, 150);
  stroke(100, 255, 100);
  strokeWeight(2);
  rect(width/2 - 100, height/2 + 160, 200, 30, 5);
  
  fill(255);
  textAlign(CENTER);
  textSize(16);
  text('📧 SAVE TO LEADERBOARD', width/2, height/2 + 180);
  
  // Restart button (smaller)
  fill(255, 255, 255, 100);
  stroke(255);
  strokeWeight(1);
  rect(width/2 - 60, height/2 + 200, 120, 20, 5);
  
  fill(255);
  textSize(12);
  text('🔄 RESTART', width/2, height/2 + 213);
  noStroke();
}

function drawEmailTouchButtons() {
  // Submit button
  fill(100, 255, 100, 150);
  stroke(100, 255, 100);
  strokeWeight(2);
  rect(width/2 - 80, height/2 + 160, 160, 30, 5);
  
  fill(255);
  textAlign(CENTER);
  textSize(14);
  text('✅ SUBMIT SCORE', width/2, height/2 + 180);
  
  // Skip button
  fill(255, 100, 100, 100);
  stroke(255, 100, 100);
  strokeWeight(1);
  rect(width/2 - 50, height/2 + 200, 100, 20, 5);
  
  fill(255);
  textSize(12);
  text('❌ SKIP', width/2, height/2 + 213);
  noStroke();
}

function drawMobileEmailInput() {
  // Email input box
  fill(255, 255, 255, 230);
  stroke(100, 200, 255);
  strokeWeight(2);
  rect(width/2 - 120, 320, 240, 35, 5);
  
  // Input text
  fill(50);
  textAlign(LEFT);
  textSize(14);
  let displayText = leaderboard.emailInput || 'Tap to enter email...';
  text(displayText, width/2 - 110, 340);
  
  // Cursor blink
  if (frameCount % 60 < 30) {
    stroke(50);
    strokeWeight(1);
    let textWidth = textWidth(leaderboard.emailInput || '');
    line(width/2 - 110 + textWidth + 2, 330, width/2 - 110 + textWidth + 2, 345);
  }
  
  noStroke();
  
  // Mobile keyboard button
  fill(100, 150, 255, 150);
  stroke(100, 150, 255);
  strokeWeight(1);
  rect(width/2 - 60, 365, 120, 25, 5);
  
  fill(255);
  textAlign(CENTER);
  textSize(12);
  text('📱 TAP TO TYPE', width/2, 380);
  noStroke();
}

function openMobileKeyboard() {
  // Create invisible input element for mobile keyboard
  let input = document.createElement('input');
  input.type = 'email';
  input.placeholder = 'Enter your email';
  input.value = leaderboard.emailInput || '';
  input.style.position = 'fixed';
  input.style.left = '50%';
  input.style.top = '50%';
  input.style.transform = 'translate(-50%, -50%)';
  input.style.zIndex = '1000';
  input.style.padding = '10px';
  input.style.fontSize = '16px';
  input.style.border = '2px solid #64C8FF';
  input.style.borderRadius = '5px';
  input.style.outline = 'none';
  
  document.body.appendChild(input);
  input.focus();
  
  // Handle input changes
  input.addEventListener('input', function() {
    leaderboard.emailInput = input.value;
  });
  
  // Handle when user is done
  input.addEventListener('blur', function() {
    document.body.removeChild(input);
  });
  
  input.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      leaderboard.emailInput = input.value;
      document.body.removeChild(input);
      submitToLeaderboard();
    }
  });
}

function windowResized() {
  // Resize canvas for mobile orientation changes
  let canvasWidth = min(400, windowWidth - 20);
  let canvasHeight = min(600, windowHeight - 20);
  resizeCanvas(canvasWidth, canvasHeight);
  
  // Recreate background graphics with new size
  bgGraphics = createGraphics(width, height * 2);
  drawBackground(bgGraphics);
}
