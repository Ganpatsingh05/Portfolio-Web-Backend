import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// const supabaseUrl = process.env.SUPABASE_URL;
const supabaseUrl  = "https://yuvejygfodghfqaydndy.supabase.co";
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1dmVqeWdmb2RnaGZxYXlkbmR5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjcwMTU4NSwiZXhwIjoyMDcyMjc3NTg1fQ.ZK7iJ-uWBuUFR_Rgsaf71ysrKgkQ8Ucq0FtnpNvOHyU";

console.log("Urls : ",supabaseUrl);
console.log("Urls 2: ",supabaseServiceKey);

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default supabase;
