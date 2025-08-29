// Supabase Configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_CONFIG = {
  url: 'https://hqjaefstdwkzheyxenpo.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxamFlZnN0ZHdremhleXhlbnBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0ODg3MzcsImV4cCI6MjA3MjA2NDczN30.kZnlsyBsQ7VaS5VfNl4nwostRd1ufAvLJTxyBu8CQx8'
};

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Game configuration
const GAME_CONFIG = {
  maxLeaderboardEntries: 10,
  emailValidationRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  minScoreForLeaderboard: 10 // Minimum score to appear on leaderboard
};
