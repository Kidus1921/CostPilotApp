
import { createClient } from '@supabase/supabase-js';

// Project Credentials
const getSupabaseConfig = () => {
  // Use import.meta.env for standard Vite environment variables
  const env = (import.meta as any).env;
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  
  const fallbackUrl = 'https://vgubtzdnimaguwaqzlpa.supabase.co';
  const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndWJ0emRuaW1hZ3V3YXF6bHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTcxODksImV4cCI6MjA4MDMzMzE4OX0.LPWuQwLbQrkMFdRTbNYdGzBv-yj3CZfl8Oyv9aDsDfw';

  // Validate URL - if it's not a real URL or is the string "undefined", use fallback
  const isValidUrl = (u: any) => {
    if (!u || typeof u !== 'string' || !u.startsWith('http') || u === 'undefined' || u === '') return false;
    // If it's a dashboard URL, it's invalid for API calls
    if (u.includes('supabase.com/dashboard')) return false;
    return true;
  };

  const isValidKey = (k: any) => k && typeof k === 'string' && k.length > 20 && k !== 'undefined' && k !== '';

  const fixUrl = (u: string) => {
    if (u.includes('supabase.com/dashboard/project/')) {
      const parts = u.split('/');
      const ref = parts[parts.length - 1].split('?')[0]; // Remove query params if any
      if (ref && ref.length >= 20) {
        return `https://${ref}.supabase.co`;
      }
    }
    return u;
  };

  const finalUrl = isValidUrl(url) ? url : (url && url.includes('supabase.com/dashboard') ? fixUrl(url) : fallbackUrl);

  return {
    url: finalUrl,
    key: isValidKey(key) ? key : fallbackKey
  };
};

const config = getSupabaseConfig();
export const PROJECT_URL = config.url;
export const PUBLISHABLE_KEY = config.key;

// console.log("Supabase: Initializing with URL", PROJECT_URL);
if (PUBLISHABLE_KEY.startsWith('sb_')) {
  // console.warn("Supabase: Using local development keys with a cloud URL may not work. Please ensure you are using the 'anon' key from your Supabase Dashboard.");
}

// Initialize Supabase Client
export const supabase = createClient(PROJECT_URL, PUBLISHABLE_KEY);
