import { Capacitor, registerPlugin } from '@capacitor/core';
import snapshot from '../data/news.json' with { type: 'json' };
if (!Capacitor.isNativePlatform())
  throw new Error('Native runtime requires an installed app');
window.AmparoNative = registerPlugin('AmparoNative');
window.AMPARO_NEWS_SNAPSHOT = snapshot;
document.documentElement.classList.add('native-ios');
document.addEventListener(
  'click',
  (event) => {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;
    const url = new URL(anchor.href, window.location.href);
    if (url.protocol !== 'https:') return;
    event.preventDefault();
    window.AmparoNative.openLink({ url: url.href }).catch(() => {
      const status = document.querySelector('#product-toast');
      if (status) {
        status.textContent = 'Could not open link / No se pudo abrir el enlace';
        status.classList.add('visible');
      }
    });
  },
  true,
);
await import('../bootstrap.js');
