import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

await mkdir('mobile/www', { recursive: true });
await cp('public', 'mobile/www', { recursive: true });
const dom = new JSDOM(await readFile('public/index.html', 'utf8'));
const document = dom.window.document;
document.querySelector('script[src="/bootstrap.js"]').remove();
const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = '/styles/native.css';
document.head.append(style);
const csp = document.createElement('meta');
csp.httpEquiv = 'Content-Security-Policy';
csp.content =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org; font-src 'self' data:; connect-src 'self' https://kipnzxueazppkbgpxckz.supabase.co wss://kipnzxueazppkbgpxckz.supabase.co https://philipgraffshapiro.github.io; object-src 'none'; base-uri 'self'; form-action 'self'";
document.head.prepend(csp);
const runtime = document.createElement('script');
runtime.type = 'module';
runtime.src = '/native-entry.js';
document.head.append(runtime);
await writeFile('mobile/www/index.html', dom.serialize());
await build({
  entryPoints: ['public/native/runtime.js'],
  outfile: 'mobile/www/native-entry.js',
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  legalComments: 'eof',
});
await writeFile(
  'mobile/www/NATIVE-LICENSES.txt',
  (await readFile('node_modules/@capacitor/core/LICENSE', 'utf8')) +
    '\n' +
    (await readFile('node_modules/@capacitor/ios/LICENSE', 'utf8')),
);
dom.window.close();
console.log('Built bundled iPhone web assets with an offline news snapshot.');
