import { icon } from '../product-icons.js';
import { escapeHTML, localText } from '../product-data.js';

export function renderCommunityHome(state) {
  const t = (en, es) => localText(state.language, en, es);
  return `<section class="product-screen home-screen community-home" data-screen="home">
    <div class="community-home-stage"><div id="home-alert-map" class="home-alert-map" aria-hidden="true"></div><div class="community-home-veil"></div>
      <div class="community-home-copy"><p class="eyebrow"><span class="community-signal"></span>${t('YOUR COMMUNITY. YOUR PEOPLE.', 'TU COMUNIDAD. TU GENTE.')}</p>
        <h1 tabindex="-1">${t('Stay aware.<br>Stay <em>together.</em>', 'Infórmate.<br>Sigue <em>junto a ellos.</em>')}</h1>
        <p>${t('See reported immigration activity. Find trusted help. Keep your family’s next steps in one place.', 'Consulta la actividad migratoria reportada. Encuentra ayuda. Reúne los siguientes pasos de tu familia en un solo lugar.')}</p>
        <div class="hero-actions"><button type="button" class="button community-primary" data-route="alerts">${icon('network')}${t('Read the latest news', 'Leer las noticias')}${icon('arrow')}</button><button type="button" class="button quiet" data-route="circle">${t('My family plan', 'Mi plan familiar')}${icon('diagonal')}</button></div>
        <div class="community-home-proof"><span><strong data-home-reports>—</strong>${t('published stories', 'noticias publicadas')}</span><span><strong>3</strong>${t('Florida counties', 'condados de Florida')}</span><span><strong>EN / ES</strong>${t('Your language', 'Tu idioma')}</span></div>
        <div class="home-greeting"><span class="avatar small">MR</span><span>${t('Your space,', 'Tu espacio,')} <strong id="welcome-name">${escapeHTML(state.name)}</strong><small>${t('Awareness. Preparation. People you trust.', 'Información. Preparación. Gente de confianza.')}</small></span></div>
      </div>
      <div class="community-home-map-label"><span class="community-signal"></span><span>${t('SOUTH FLORIDA', 'SUR DE FLORIDA')}</span><span>${t('ILLUSTRATIVE MAP', 'MAPA ILUSTRATIVO')}</span></div>
      <article class="community-home-feed"><div class="community-home-feed-head"><div><span class="eyebrow">${t('FROM THE NEWSROOMS', 'DESDE LOS MEDIOS')}</span><h2>${t('A little more informed.', 'Un poco más informado.')}</h2></div><span class="community-live-symbol">${icon('pulse')}</span></div><div class="community-home-feed-meta"><span>${t('Original sources · Separate event timing', 'Fuentes originales · Fecha del evento por separado')}</span></div><div id="home-community-reports"></div><button type="button" class="community-home-feed-link" data-route="alerts">${t('Explore published news', 'Explorar noticias')}${icon('arrow')}</button></article>
    </div>
    <div class="home-bottom community-home-bottom"><button class="home-summary" type="button" data-route="documents"><span class="summary-icon">${icon('documents')}</span><span><small>${t('BE PREPARED', 'PREPÁRATE')}</small><strong id="home-readiness">2 / 5 ${t('categories ready', 'categorías listas')}</strong></span>${icon('arrow')}</button><button class="home-summary" type="button" data-route="circle"><span class="summary-icon">${icon('people')}</span><span><small>${t('KEEP THEM CLOSE', 'MANTÉNLOS CERCA')}</small><strong id="home-circle-count">2 ${t('trusted contacts', 'contactos de confianza')}</strong></span>${icon('arrow')}</button><button class="home-summary assistant-summary" type="button" data-route="assistant"><span class="summary-icon">${icon('assistant')}</span><span><small>AMPARO AI</small><strong>${t('Find your next step.', 'Encuentra tu siguiente paso.')}</strong></span>${icon('arrow')}</button></div>
  </section>`;
}
