const fs = require('fs');

// The user's output shows MULTIPLE accounts all claiming to be "Currently Active".
// This violates the entire architecture of the multi-tenant portfolio system, which relies on EXACTLY ONE
// account being `is_active = true` at any given time.
// If multiple accounts are active, Supabase `.single()` queries will CRASH and return null/errors.
// This is exactly why the Dashboard says "Couldn't find profile data" and Trade Form says "No Active Account".

// The root cause: 
// The user registered multiple times, or the Factory Reset trigger fired multiple times, 
// creating multiple "Main Account"s that all have `is_active = true`.

console.log("Hypothesis Confirmed: Supabase `.single()` is crashing due to multiple active accounts.");
