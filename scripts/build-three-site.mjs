import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyLocalRelease } from './verify-release-assets.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
verifyLocalRelease(path.join(root,'web'));
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.cpSync(path.join(root,'web'),path.join(root,'dist'),{recursive:true});
console.log('Static world prepared in dist; original web/ remains the Pages source.');
