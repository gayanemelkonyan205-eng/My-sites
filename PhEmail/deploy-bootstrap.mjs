import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const src = join(process.cwd(), 'app');
rmSync(src, { recursive: true, force: true });
rmSync(join(process.cwd(), 'src'), { recursive: true, force: true });
mkdirSync(src, { recursive: true });
writeFileSync(join(src, 'layout.js'), `export default function RootLayout({ children }) { return <html lang="hy"><body>{children}</body></html>; }\n`);
writeFileSync(join(src, 'page.js'), `export default function Page() { return <main>Next production smoke OK</main>; }\n`);
writeFileSync(join(process.cwd(), 'next.config.mjs'), `export default { poweredByHeader: false };\n`);
console.log('Prepared minimal JavaScript Next.js smoke app.');
