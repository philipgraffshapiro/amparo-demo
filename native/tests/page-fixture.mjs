import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { mountProduct } from '../public/product.js';
export function page(options = {}) {
  const dom = new JSDOM(readFileSync('public/index.html', 'utf8'), {
    url: 'http://localhost:4837',
    pretendToBeVisual: true,
  });
  dom.window.matchMedia = () => ({ matches: true, addEventListener() {} });
  if (options.blockStorage)
    Object.defineProperty(dom.window, 'localStorage', {
      get() {
        throw new Error('Storage blocked');
      },
    });
  const app = mountProduct(dom.window, {
    maps: false,
    animate: false,
    ...options,
  });
  return {
    dom,
    app,
    doc: dom.window.document,
    close() {
      app.destroy();
      dom.window.close();
    },
  };
}
export const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
export const fill = (doc, name, value) => {
  doc.querySelector(`[name="${name}"]`).value = value;
};
