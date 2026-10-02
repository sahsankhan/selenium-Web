import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiBaseUrl = process.env.UI_BASE_URL || 'https://practicesoftwaretesting.com';

function writeReport(result) {
  const passed = result.status === 0;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Selenium report</title>
  <style>
    body { font-family: Segoe UI, sans-serif; margin: 2rem; }
    .ok { color: #0a7a32; }
    .bad { color: #a12622; }
  </style>
</head>
<body>
  <h1>Selenium — Toolshop register and sign in</h1>
  <p class="${passed ? 'ok' : 'bad'}">${passed ? 'Passed' : 'Failed'}</p>
  <p>Register a new customer on Toolshop, sign in, and confirm the account menu is visible.</p>
  <p>Site: ${uiBaseUrl}</p>
  <p>Exit code: ${result.status ?? 'signal'}</p>
</body>
</html>`;
}

const test = spawn(process.execPath, ['--test', 'tests/login-journey.test.mjs'], {
  cwd: root,
  env: { ...process.env, UI_BASE_URL: uiBaseUrl },
  stdio: 'inherit',
});

const exitCode = await new Promise((resolve) => {
  test.on('exit', (code) => resolve(code ?? 1));
});

const reportDir = path.join(root, 'reports');
await mkdir(reportDir, { recursive: true });
await writeFile(path.join(reportDir, 'index.html'), writeReport({ status: exitCode }), 'utf8');
console.log(`HTML report: ${path.join(reportDir, 'index.html')}`);
process.exit(exitCode);
