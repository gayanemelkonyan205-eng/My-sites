import { cpSync, copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const source = resolve(process.cwd(), '..', 'class-portal');
if (!existsSync(source)) throw new Error('class-portal source directory is missing');
for (const path of ['app', 'src', 'public', 'next.config.ts', 'next.config.mjs', 'next-env.d.ts', 'postcss.config.mjs', 'tsconfig.json']) {
  rmSync(join(process.cwd(), path), { recursive: true, force: true });
}
cpSync(join(source, 'src'), join(process.cwd(), 'src'), { recursive: true });
for (const file of ['next-env.d.ts', 'postcss.config.mjs', 'tsconfig.json']) {
  const from = join(source, file);
  if (existsSync(from)) copyFileSync(from, join(process.cwd(), file));
}
const publicDir = join(process.cwd(), 'public');
const sourcePublic = join(source, 'public');
if (existsSync(sourcePublic)) cpSync(sourcePublic, publicDir, { recursive: true });
else mkdirSync(publicDir, { recursive: true });
writeFileSync(join(process.cwd(), 'next.config.mjs'), `export default { poweredByHeader: false, typescript: { ignoreBuildErrors: true } };\n`);

const tsc = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], { encoding: 'utf8' });
writeFileSync(join(publicDir, 'type-errors.txt'), `${tsc.stdout ?? ''}${tsc.stderr ?? ''}` || 'NO_TYPE_ERRORS');
console.log(`Captured TypeScript diagnostics (exit ${tsc.status ?? 'unknown'}).`);
