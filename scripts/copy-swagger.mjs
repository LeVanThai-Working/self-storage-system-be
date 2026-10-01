import { cp } from 'node:fs/promises';

await cp('src/config/swagger.json', 'dist/config/swagger.json');
