const fs = require('fs');

let content = fs.readFileSync('src/app/settings/page.tsx', 'utf8');

// There is a <div className="mt-12 pt-8 border-t border-border/50"> at line 238 that never gets closed before the TabsContent closes.
// I will just add the missing </div> directly to where it belongs.

content = content.replace(
  /<\/Card>\n          <\/div>\n        <\/div>\n          <\/TabsContent>/g,
  '</Card>\n          </div>\n        </div>\n          </TabsContent>'
); // The previous sed fixed one div but maybe it needed to fix the original block.

// Let's explicitly search and replace that exact chunk.
const brokenBlock = `</Card>
          </div>
        
          </TabsContent>`;

const fixedBlock = `</Card>
          </div>
        </div>
          </TabsContent>`;

if (content.includes(brokenBlock)) {
  content = content.replace(brokenBlock, fixedBlock);
}

fs.writeFileSync('src/app/settings/page.tsx', content);

