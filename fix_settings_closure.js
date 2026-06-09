const fs = require('fs');

let content = fs.readFileSync('src/app/settings/page.tsx', 'utf8');
content = content.replace('    </AppLayout>', '    </AppLayout>\n  );\n}');

// Wait, the error is TS17008: JSX element 'div' has no corresponding closing tag.
// And TS1005: ')' expected.
// The file is missing `  );\n}` entirely.

fs.writeFileSync('src/app/settings/page.tsx', content);

