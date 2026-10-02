import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const report = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../reports/index.html');
const opener = process.platform === 'win32' ? 'cmd' : 'xdg-open';
const args = process.platform === 'win32' ? ['/c', 'start', '', report] : [report];
spawn(opener, args, { detached: true, stdio: 'ignore' }).unref();
