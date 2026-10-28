import { mountProduct } from './product.js';

import { createAccountService } from './account/service.js';
mountProduct(window, {
  account: { service: createAccountService(window) },
  ...(window.AmparoNative
    ? {
        news: {
          fetch: (_url, options) =>
            window.fetch(
              'https://philipgraffshapiro.github.io/amparo-demo/data/news.json',
              options,
            ),
        },
      }
    : {}),
});
