const fs = require('fs');

let dashboard = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

// The user is highlighting that when they switch accounts, the Dashboard might not be displaying the correct
// $340 balance of the newly activated account, and might still be defaulting to 0 or another number.
// Let's audit the dashboard fetch logic to make sure the state is properly populated.

console.log("Auditing Dashboard Fetch Logic:");
const fetchLines = dashboard.split('\n').filter(l => l.includes('setProfile') || l.includes('activePort'));
console.log(fetchLines.join('\n'));

