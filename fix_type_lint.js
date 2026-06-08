const fs = require('fs');

let api = fs.readFileSync('src/app/api/delete-image/route.ts', 'utf8');
api = api.replace('catch (error: any)', 'catch (error: unknown)');
api = api.replace('error.message', '(error as Error).message');
fs.writeFileSync('src/app/api/delete-image/route.ts', api);

