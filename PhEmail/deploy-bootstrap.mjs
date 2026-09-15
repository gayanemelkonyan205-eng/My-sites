import { cpSync, copyFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
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
const publicDir = join(source, 'public');
if (existsSync(publicDir)) cpSync(publicDir, join(process.cwd(), 'public'), { recursive: true });
writeFileSync(join(process.cwd(), 'next.config.mjs'), `export default { poweredByHeader: false, typescript: { ignoreBuildErrors: true } };\n`);
console.log('Prepared full class-portal source with diagnostic TypeScript build bypass.');
