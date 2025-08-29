// Leaderboard functionality with Supabase integration

class LeaderboardManager {
  constructor() {
    this.isSubmitting = false;
    this.leaderboardData = [];
    this.emailInput = '';
    this.showingLeaderboard = false;
  }

  // Validate email format
  validateEmail(email) {
    return GAME_CONFIG.emailValidationRegex.test(email);
  }

  // Mask email for privacy (mario@gmail.com -> m***o@g***.com)
  maskEmail(email) {
    const [localPart, domain] = email.split('@');
    const [domainName, extension] = domain.split('.');
    
    const maskedLocal = localPart.length > 2 ? 
      localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1] :
      localPart;
    
    const maskedDomain = domainName.length > 2 ? 
      domainName[0] + '*'.repeat(domainName.length - 2) + domainName[domainName.length - 1] :
      domainName;

    return `${maskedLocal}@${maskedDomain}.${extension}`;
  }

  // Submit score to Supabase
  async submitScore(email, score, survivalTime, achievement) {
    if (!this.validateEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (score < GAME_CONFIG.minScoreForLeaderboard) {
      throw new Error('Score too low for leaderboard');
    }

    this.isSubmitting = true;

    try {
      const { data, error } = await supabaseClient
        .from('leaderboard')
        .insert([
          {
            email: email.toLowerCase().trim(),
            score: Math.floor(score),
            survival_time: Math.floor(survivalTime),
            achievement: achievement
          }
        ]);

      if (error) throw error;

      // Fetch updated leaderboard
      await this.fetchLeaderboard();
      
      return { success: true, data };
    } catch (error) {
      console.error('Error submitting score:', error);
      throw error;
    } finally {
      this.isSubmitting = false;
    }
  }

  // Fetch leaderboard from Supabase
  async fetchLeaderboard() {
    try {
      const { data, error } = await supabaseClient
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(GAME_CONFIG.maxLeaderboardEntries);

      if (error) throw error;

      this.leaderboardData = data || [];
      return this.leaderboardData;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  // Get user's rank by email
  getUserRank(email) {
    const index = this.leaderboardData.findIndex(entry => 
      entry.email.toLowerCase() === email.toLowerCase()
    );
    return index >= 0 ? index + 1 : null;
  }

  // Format achievement based on survival time
  getAchievement(survivalTime) {
    if (survivalTime < 20) return "🍼 Toddler Driver";
    if (survivalTime < 40) return "🚗 Getting Good";
    if (survivalTime < 80) return "🏎️ Speed Demon";
    if (survivalTime < 120) return "🔥 Racing Pro";
    return "🏆 AI Racing Legend";
  }

  // Draw email input form
  drawEmailInput(x, y, width, height) {
    // Input box background
    fill(255, 255, 255, 230);
    stroke(100, 200, 255);
    strokeWeight(2);
    rect(x, y, width, height, 5);
    
    // Input text
    fill(50);
    textAlign(LEFT);
    textSize(16);
    text(this.emailInput || 'Enter your email...', x + 10, y + height/2 + 6);
    
    // Cursor blink
    if (!this.emailInput && frameCount % 60 < 30) {
      stroke(50);
      strokeWeight(1);
      line(x + 140, y + 8, x + 140, y + height - 8);
    }
    
    noStroke();
  }

  // Draw leaderboard
  drawLeaderboard() {
    // Background overlay
    fill(0, 0, 0, 200);
    rect(0, 0, width, height);
    
    // Leaderboard panel
    fill(30, 30, 50, 240);
    stroke(100, 200, 255);
    strokeWeight(3);
    rect(50, 80, width - 100, height - 160, 10);
    noStroke();
    
    // Title
    fill(255, 215, 0);
    textAlign(CENTER);
    textSize(24);
    text('🏆 LEADERBOARD 🏆', width/2, 120);
    
    // Headers
    fill(255);
    textSize(14);
    textAlign(LEFT);
    text('RANK', 80, 150);
    text('PLAYER', 130, 150);
    text('TIME', 280, 150);
    text('SCORE', 340, 150);
    
    // Leaderboard entries
    for (let i = 0; i < Math.min(8, this.leaderboardData.length); i++) {
      const entry = this.leaderboardData[i];
      const y = 175 + i * 25;
      
      // Rank colors
      if (i === 0) fill(255, 215, 0); // Gold
      else if (i === 1) fill(192, 192, 192); // Silver
      else if (i === 2) fill(205, 127, 50); // Bronze
      else fill(255);
      
      textAlign(LEFT);
      textSize(12);
      
      // Rank
      text(`#${i + 1}`, 80, y);
      
      // Email (masked)
      text(this.maskEmail(entry.email), 130, y);
      
      // Time
      text(`${entry.survival_time}s`, 280, y);
      
      // Score
      text(entry.score, 340, y);
    }
    
    // Close button
    fill(255, 100, 100);
    textAlign(CENTER);
    textSize(16);
    text('Press SPACE to Play Again', width/2, height - 50);
  }

  // Handle keyboard input for email
  handleKeyInput(key, keyCode) {
    if (keyCode === BACKSPACE && this.emailInput.length > 0) {
      this.emailInput = this.emailInput.slice(0, -1);
    } else if (keyCode === ENTER) {
      return true; // Submit
    } else if (key.length === 1 && this.emailInput.length < 50) {
      // Only allow printable characters
      if (key.charCodeAt(0) >= 32 && key.charCodeAt(0) <= 126) {
        this.emailInput += key;
      }
    }
    return false;
  }
}

// Global leaderboard manager instance
const leaderboard = new LeaderboardManager();
