
import { createClient } from '@supabase/supabase-js';

// Project Credentials
// We use the variables defined in vite.config.ts which are sourced from .env or environment
export const PROJECT_URL = process.env.REACT_APP_SUPABASE_URL || 'https://vgubtzdnimaguwaqzlpa.supabase.co';
export const PUBLISHABLE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndWJ0emRuaW1hZ3V3YXF6bHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTcxODksImV4cCI6MjA4MDMzMzE4OX0.LPWuQwLbQrkMFdRTbNYdGzBv-yj3CZfl8Oyv9aDsDfw';

console.log("Supabase: Initializing with URL", PROJECT_URL);
if (PUBLISHABLE_KEY.startsWith('sb_')) {
  console.warn("Supabase: Using local development keys with a cloud URL may not work. Please ensure you are using the 'anon' key from your Supabase Dashboard.");
}

// Initialize Supabase Client
export const supabase = createClient(PROJECT_URL, PUBLISHABLE_KEY);
