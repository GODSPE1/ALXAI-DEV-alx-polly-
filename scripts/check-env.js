#!/usr/bin/env node

// Script to check if environment variables are properly loaded
console.log("Checking environment variables...");

// Log the current environment
console.log("NODE_ENV:", process.env.NODE_ENV);

// Check Supabase variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl || "Not defined");
console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:",
  supabaseAnonKey
    ? `${supabaseAnonKey.substring(0, 5)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 5)}`
    : "Not defined"
);

// Check if variables are properly defined
if (!supabaseUrl) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL is missing!");
} else {
  console.log("✓ NEXT_PUBLIC_SUPABASE_URL is defined");
}

if (!supabaseAnonKey) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing!");
} else {
  console.log("✓ NEXT_PUBLIC_SUPABASE_ANON_KEY is defined");
}

// Log where Next.js might be looking for environment variables
console.log("\nNext.js environment loading order:");
console.log("1. .env.$(NODE_ENV).local");
console.log("2. .env.local");
console.log("3. .env.$(NODE_ENV)");
console.log("4. .env");

// Provide suggestions
console.log("\nSuggestions if environment variables are not loading:");
console.log("1. Make sure your .env.local file is in the project root directory");
console.log("2. Verify there are no syntax errors in your .env.local file");
console.log("3. Try using double quotes around values with special characters");
console.log("4. Restart your Next.js server after making changes");
console.log("5. Check if .env.local is being ignored in .gitignore");
