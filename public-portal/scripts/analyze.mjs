#!/usr/bin/env node
/**
 * Bundle composition report. Builds with ANALYZE=true so vite.config.js adds
 * rollup-plugin-visualizer, then prints where the report was written.
 *
 * Kept as a script rather than an inline env prefix so it works the same way
 * on Windows PowerShell and on POSIX shells, without pulling in cross-env.
 */
import { spawn } from 'node:child_process';

// Invoke Vite's JS entry through the current Node binary. This avoids
// `shell: true` (which mangles paths on Windows) and avoids depending on the
// .bin shim being present or executable.
const child = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'build'],
  {
    stdio: 'inherit',
    env: { ...process.env, ANALYZE: 'true' },
  }
);

child.on('exit', (code) => {
  if (code === 0) {
    console.log('\nBundle composition report written to dist/bundle-report.html');
    console.log('Open it to see which modules dominate each chunk.');
  }
  process.exit(code ?? 1);
});