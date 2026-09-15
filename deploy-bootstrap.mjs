import { cpSync, copyFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const source = join(process.cwd(), 'class-portal');
if (!existsSync(source)) throw new Error('class-portal source directory is missing');

for (const path of ['src', 'next-env.d.ts', 'postcss.config.mjs', 'tsconfig.json']) {
  const from = join(source, path);
  const to = join(process.cwd(), path);
  if (path === 'src') {
    rmSync(to, { recursive: true, force: true });
    cpSync(from, to, { recursive: true });
  } else {
    copyFileSync(from, to);
  }
}

writeFileSync(join(process.cwd(), 'next.config.mjs'), `export default {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://yknzcvooglrsvyidestj.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_BntzoD9F20GkbI5A0yhmQw_1Z5-WrtJ',
    NEXT_PUBLIC_APP_NAME: 'Դասարան',
    NEXT_PUBLIC_DEMO_MODE: 'false'
  }
};\n`);

console.log('Prepared class-portal source for Vercel build.');
