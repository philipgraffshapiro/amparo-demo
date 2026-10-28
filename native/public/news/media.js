import { newsMedia } from './image-policy.js';

// These local images support saved snapshots of their exact publisher stories.
// Live feed images take precedence; never borrow another story's photograph.
const photos = new Map([
  [
    'https://wsvn.com/news/politics/cuban-americans-support-gop-poll/',
    {
      src: 'media/news/wsvn-fiu-poll.webp',
      en: 'FIU’s Cuba Poll 2026 report cover, shown by WSVN.',
      es: 'Portada del informe Cuba Poll 2026 de FIU, publicada por WSVN.',
      credit: 'WSVN 7News / FIU',
    },
  ],
  [
    'https://www.telemundo51.com/noticias/inmigracion/documentos-respaldan-que-ice-retiene-ciudadano-eeuu-enfermo-desde-enero-ap/2841189/',
    {
      src: 'media/news/telemundo-ice-badge.webp',
      en: 'ICE badge in the publisher’s article image. File photograph.',
      es: 'Insignia de ICE en la imagen del artículo. Fotografía de archivo.',
      credit: 'Telemundo 51 / Getty Images',
    },
  ],
  [
    'https://www.telemundo51.com/noticias/local/es-como-si-estuvieramos-muertas-cubanas-deportadas-a-africa-denuncian-maltratos-y-condiciones-precarias/2841161/',
    {
      src: 'media/news/telemundo-cuban-deportees.webp',
      en: 'Image published with Telemundo 51’s report about Cuban women deported to Africa.',
      es: 'Imagen publicada con el reportaje de Telemundo 51 sobre cubanas deportadas a África.',
      credit: 'Telemundo 51',
    },
  ],
]);

export function newsPhoto(item) {
  const media = newsMedia(item.media, item.sourceId)[0];
  if (media)
    return {
      src: media.url,
      en: media.alt || `Image published by ${item.sourceName}.`,
      es: media.alt || `Imagen publicada por ${item.sourceName}.`,
      credit: media.credit || item.sourceName,
    };
  return photos.get(item.url) || null;
}
