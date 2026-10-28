import { icon } from './product-icons.js';
import { localText } from './product-data.js';
import { renderProductViews } from './product-views.js';

export function renderProductShell(
  state,
  features = { communityAlerts: true },
) {
  const t = (en, es) => localText(state.language, en, es);
  const tabs = [
    [
      features.communityAlerts ? 'alerts' : 'network',
      features.communityAlerts ? t('Alerts', 'Alertas') : t('Network', 'Red'),
    ],
    ['documents', t('Documents', 'Documentos')],
    ['home', t('Home', 'Inicio')],
    ['assistant', 'Amparo AI'],
    ['more', t('Menu', 'Menú')],
  ];
  const links = [
    ['home', t('Home', 'Inicio')],
    ...(features.communityAlerts
      ? [['alerts', t('Alerts map', 'Mapa de alertas')]]
      : []),
    ['network', t('Find help', 'Buscar ayuda')],
    ['documents', t('Documents', 'Documentos')],
    ['circle', t('My family', 'Mi familia')],
  ];
  const menuLinks = [
    ...links,
    ['assistant', 'Amparo AI'],
    ['membership', t('Membership', 'Membresía')],
    ['more', t('My account', 'Mi cuenta')],
  ];
  const link = ([name, label]) =>
    `<a href="#${name}" data-route="${name}">${label}</a>`;
  return `<a href="#app-main" class="skip-link">${t('Skip to content', 'Saltar al contenido')}</a>
    <header class="product-header"><a href="#home" class="product-brand" data-route="home" aria-label="${t('Amparo home', 'Inicio de Amparo')}"><span class="brand-symbol">${icon('shield')}</span><span>amparo<span class="brand-period">.</span></span></a>
      <nav class="desktop-links" aria-label="${t('Main navigation', 'Navegación principal')}">${links.map(link).join('')}</nav>
      <div class="header-actions"><button type="button" class="icon-button theme-control" data-action="theme" aria-label="${t('Change color theme', 'Cambiar tema de color')}">${icon(state.theme === 'dark' ? 'sun' : 'moon')}</button><button type="button" class="language-control" id="product-language">${t('ES', 'EN')}</button><button type="button" class="header-alert" data-dialog="alert" aria-label="${t('Family alert', 'Alerta familiar')}">${icon('shield')}<span>${t('Family alert', 'Alerta familiar')}</span></button><button type="button" class="avatar header-avatar" data-route="more" aria-label="${t('Open account', 'Abrir cuenta')}">MR</button>
        <details class="site-menu"><summary aria-label="${t('Open navigation menu', 'Abrir menú de navegación')}">${icon('menu')}</summary><nav aria-label="${t('All sections', 'Todas las secciones')}">${menuLinks.map(link).join('')}</nav></details>
      </div>
    </header>
    <main id="app-main" tabindex="-1">${renderProductViews(state, features)}<div class="map-credit"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap ${t('contributors', 'colaboradores')}</a></div></main>
    <div class="dock-wrap"><nav id="product-dock" class="product-dock" aria-label="${t('Product navigation', 'Navegación del producto')}"><span class="dock-indicator" aria-hidden="true"></span>${tabs.map(([name, label]) => `<button type="button" data-route="${name}" ${name === 'home' ? 'aria-current="page"' : ''}>${icon(name)}<span>${label}</span></button>`).join('')}</nav></div>
    <button class="desktop-agent" type="button" data-route="assistant"><span class="agent-mini-orb">${icon('assistant')}</span><span>Amparo AI<small>${t('A clearer next step', 'Un siguiente paso claro')}</small></span>${icon('diagonal')}</button>
    <dialog id="product-dialog" aria-labelledby="dialog-title"><div id="dialog-content"></div></dialog>
    ${features.communityAlerts ? '<dialog id="community-dialog" aria-labelledby="community-dialog-title"><div id="community-dialog-content"></div></dialog>' : ''}
    <div id="product-toast" class="product-toast" role="status" aria-live="polite"></div>`;
}
