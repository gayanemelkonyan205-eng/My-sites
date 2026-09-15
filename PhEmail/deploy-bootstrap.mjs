import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const src = join(process.cwd(), 'src');
rmSync(src, { recursive: true, force: true });
mkdirSync(join(src, 'app'), { recursive: true });
writeFileSync(join(src, 'app', 'layout.tsx'), `export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="hy"><body>{children}</body></html>; }\n`);
writeFileSync(join(src, 'app', 'page.tsx'), `export default function Page() { return <main>Class Portal build smoke test</main>; }\n`);
writeFileSync(join(src, 'app', 'globals.css'), `body{font-family:system-ui,sans-serif;margin:0;padding:2rem}\n`);
writeFileSync(join(process.cwd(), 'tsconfig.json'), JSON.stringify({compilerOptions:{target:'ES2022',lib:['dom','dom.iterable','es2023'],strict:true,noEmit:true,esModuleInterop:true,module:'esnext',moduleResolution:'bundler',isolatedModules:true,jsx:'react-jsx',plugins:[{name:'next'}]},include:['next-env.d.ts','**/*.ts','**/*.tsx','.next/types/**/*.ts'],exclude:['node_modules']}, null, 2));
writeFileSync(join(process.cwd(), 'next-env.d.ts'), `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n`);
writeFileSync(join(process.cwd(), 'next.config.mjs'), `export default { poweredByHeader: false };\n`);
console.log('Prepared minimal Next.js smoke app.');
