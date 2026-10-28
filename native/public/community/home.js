import { icon } from '../product-icons.js';
import { escapeHTML, localText } from '../product-data.js';

export function renderCommunityHome(state) {
  const t = (en, es) => localText(state.language, en, es);
  return `<section class="product-screen home-screen community-home" data-screen="home">
    <div class="community-home-stage">
      <div class="community-home-copy">
        <p class="community-home-welcome">${t('Welcome,', 'Bienvenido,')} <span id="welcome-name">${escapeHTML(state.name)}</span></p>
        <h1 tabindex="-1">${t('A plan for<br>your family.', 'Un plan para<br>tu familia.')}</h1>
        <p>${t('Keep your documents and emergency contacts together. Find legal help near you.', 'Reúne tus documentos y contactos de emergencia. Encuentra ayuda legal cerca de ti.')}</p>
        <div class="hero-actions"><button type="button" class="button community-primary" data-route="circle">${t('My family plan', 'Mi plan familiar')}${icon('arrow')}</button><button type="button" class="button quiet" data-route="network">${t('Find local help', 'Buscar ayuda local')}${icon('pin')}</button></div>
      </div>
      <div class="community-home-map-preview"><div id="home-alert-map" class="home-alert-map" aria-hidden="true"></div><div class="community-home-veil"></div><span class="community-home-map-label">${t('South Florida · Illustrative map', 'Sur de Florida · Mapa ilustrativo')}</span></div>
    </div>
    <section class="community-home-feed" aria-labelledby="home-news-heading"><div class="community-home-feed-head"><h2 id="home-news-heading">${t('In the news', 'En las noticias')}</h2><button type="button" class="community-home-feed-link" data-route="alerts">${t('All news', 'Todas las noticias')}${icon('arrow')}</button></div><div id="home-community-reports"></div></section>
    <div class="home-bottom community-home-bottom"><button class="home-summary" type="button" data-route="documents"><span class="summary-icon">${icon('documents')}</span><span><small>${t('Documents', 'Documentos')}</small><strong id="home-readiness">2 / 5 ${t('categories ready', 'categorías listas')}</strong></span>${icon('arrow')}</button><button class="home-summary" type="button" data-route="circle"><span class="summary-icon">${icon('people')}</span><span><small>${t('My circle', 'Mi círculo')}</small><strong id="home-circle-count">2 ${t('trusted contacts', 'contactos de confianza')}</strong></span>${icon('arrow')}</button><button class="home-summary assistant-summary" type="button" data-route="assistant"><span class="summary-icon">${icon('assistant')}</span><span><small>Amparo AI</small><strong>${t('Find your next step', 'Encuentra tu siguiente paso')}</strong></span>${icon('arrow')}</button></div>
  </section>`;
}
