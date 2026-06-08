const fs = require('fs');

let content = fs.readFileSync('src/types/index.ts', 'utf8');

const newTypes = `
export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  starting_balance: number;
  current_balance: number;
  currency: string;
}
`;

content = content + newTypes;

content = content.replace(
  'user_id: string;',
  'user_id: string;\n  portfolio_id?: string;'
);

fs.writeFileSync('src/types/index.ts', content);

