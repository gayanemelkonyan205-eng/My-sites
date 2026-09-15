import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

for (const path of ['app', 'src', 'public', 'next.config.ts', 'next.config.mjs', 'next-env.d.ts', 'postcss.config.mjs', 'tsconfig.json']) {
  rmSync(join(process.cwd(), path), { recursive: true, force: true });
}
const app = join(process.cwd(), 'app');
mkdirSync(app, { recursive: true });
writeFileSync(join(app, 'layout.js'), `export default function RootLayout({ children }) { return <html lang="hy"><body>{children}</body></html>; }\n`);
writeFileSync(join(app, 'page.js'), `export default function Page() { return <main>Full dependency smoke OK</main>; }\n`);
writeFileSync(join(process.cwd(), 'next.config.mjs'), `export default { poweredByHeader: false };\n`);
console.log('Prepared full-dependency smoke app.');
