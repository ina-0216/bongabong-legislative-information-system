const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const serverRoot = path.resolve(__dirname, '..');
const cli = path.join(serverRoot, 'node_modules/mammoth/bin/mammoth');
const patch = path.join(serverRoot, 'patches/mammoth+1.13.0.patch');
const readCli = () => fs.readFileSync(cli, 'utf8');
let source = readCli();

if (source.includes('add_help: true')) {
  console.log('[postinstall] Mammoth compatibility patch already applied.');
} else if (source.includes('addHelp: true')) {
  // Git applies paths relative to the monorepo root even when npm runs this
  // lifecycle script from server/. Anchor the patch under server/ explicitly.
  execFileSync('git', ['apply', '--directory=server', patch], {
    cwd: serverRoot,
    stdio: 'inherit',
  });
  source = readCli();
  if (!source.includes('add_help: true')) {
    throw new Error(`Mammoth compatibility patch did not update ${cli}`);
  }
  console.log('[postinstall] Applied Mammoth compatibility patch.');
} else {
  console.error(
    '[postinstall] Mammoth CLI source changed; patch was not applied. ' +
      'Verify DOCX extraction before deploying.',
  );
  process.exit(1);
}
