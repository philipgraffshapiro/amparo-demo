import { renderCommunityHome } from './community/home.js';
import { renderCommunityShell } from './community/views.js';
import { icon } from './product-icons.js';
import { escapeHTML, localText, documentCategories } from './product-data.js';

export function renderProductViews(
  state,
  features = { communityAlerts: true },
) {
  const t = (en, es) => localText(state.language, en, es);
  const route = (name, label, glyph = 'arrow', className = 'text-action') =>
    `<button type="button" class="${className}" data-route="${name}">${label}${icon(glyph)}</button>`;
  const title = (number, kicker, heading, sub, action = '') =>
    `<div class="page-heading"><div><h1 tabindex="-1">${heading}</h1><p class="page-description">${sub}</p></div>${action}</div>`;
  const home = features.communityAlerts
    ? renderCommunityHome(state)
    : `<section class="product-screen home-screen" data-screen="home">
    <div class="home-stage"><div id="home-map" class="home-map" aria-hidden="true"></div><div class="home-map-veil"></div>
      <div class="home-coordinates"><span>25.7617° N · 80.1918° W</span><span>${t('SOUTH FLORIDA / SAMPLE NETWORK', 'SUR DE FLORIDA / RED DE EJEMPLO')}</span></div>
      <div class="home-copy"><p class="eyebrow"><span class="status-spark"></span>${t('YOUR PEOPLE. YOUR PLAN.', 'TU GENTE. TU PLAN.')}</p><h1 tabindex="-1">${t('Life moves.<br>Stay connected.', 'La vida sigue.<br>Sigamos unidos.')}</h1><p>${t('Your documents. Your trusted people. A clear next step. Everything that matters, together.', 'Tus documentos. Tu gente de confianza. Un siguiente paso claro. Todo lo importante, unido.')}</p><div class="hero-actions">${route('circle', t('Open my family space', 'Abrir mi espacio familiar'), 'arrow', 'button primary')}${route('network', t('Explore the network', 'Explorar la red'), 'diagonal', 'button quiet')}</div><div class="home-greeting"><span class="avatar small">MR</span><span>${t('Welcome back,', 'Te damos la bienvenida,')} <strong id="welcome-name">${escapeHTML(state.name)}</strong><small>${t('Your demo space is ready to explore.', 'Tu espacio de ejemplo está listo.')}</small></span></div></div>
      <button class="home-map-label" type="button" data-route="network"><span class="locator-orbit">${icon('pin')}</span><span><small>${t('CONNECTED ACROSS FLORIDA', 'CONECTADOS EN FLORIDA')}</small><strong>Miami · Broward · Palm Beach</strong></span>${icon('diagonal')}</button>
      <button class="home-circle-card" type="button" data-route="circle"><span class="eyebrow">${t('YOUR TRUSTED CIRCLE', 'TU CÍRCULO DE CONFIANZA')}</span><span class="circle-avatars"><span class="avatar">ER</span><span class="avatar warm">CR</span><span class="avatar outline">${icon('plus')}</span></span><strong>${t('The people who matter.', 'Las personas que importan.')}</strong><span class="subtle">${t('One plan. Everyone in the loop.', 'Un plan. Todos conectados.')}</span>${icon('arrow', 'card-arrow')}</button>
      <div class="home-scene-caption"><span class="connection-line"></span>${t('A network you can explore. A plan you can build.', 'Una red para explorar. Un plan para construir.')}</div>
    </div>
    <div class="home-bottom"><button class="home-summary" type="button" data-route="documents"><span class="summary-icon">${icon('documents')}</span><span><small>${t('YOUR DOCUMENTS', 'TUS DOCUMENTOS')}</small><strong id="home-readiness">2 / 5 ${t('categories ready', 'categorías listas')}</strong></span>${icon('arrow')}</button><button class="home-summary" type="button" data-route="circle"><span class="summary-icon">${icon('people')}</span><span><small>${t('YOUR PEOPLE', 'TU GENTE')}</small><strong id="home-circle-count">2 ${t('trusted contacts', 'contactos de confianza')}</strong></span>${icon('arrow')}</button><button class="home-summary assistant-summary" type="button" data-route="assistant"><span class="summary-icon">${icon('assistant')}</span><span><small>AMPARO AI</small><strong>${t('Make your next step clearer.', 'Aclara tu siguiente paso.')}</strong></span>${icon('arrow')}</button></div>
  </section>`;
  return `${home}${features.communityAlerts ? renderCommunityShell(state.language) : ''}
  <section class="product-screen network-screen" data-screen="network" hidden>
    <aside class="network-sidebar"><p class="eyebrow">01 / ${t('YOUR NETWORK', 'TU RED')}</p><h1 tabindex="-1">${t('Find local help', 'Ayuda cerca de ti')}</h1><p class="page-description">${t('Explore legal access and community support in South Florida.', 'Explora acceso legal y apoyo comunitario en el sur de Florida.')}</p><label class="search-field">${icon('search')}<input id="network-search" type="search" autocomplete="off" placeholder="${t('Search a city or county', 'Buscar ciudad o condado')}" aria-label="${t('Search the network', 'Buscar en la red')}"></label><div class="filter-tabs" aria-label="${t('Network filters', 'Filtros de la red')}"><button type="button" data-network-filter="all" class="selected" aria-pressed="true">${t('All', 'Todos')}</button><button type="button" data-network-filter="legal" aria-pressed="false">${t('Legal access', 'Acceso legal')}</button><button type="button" data-network-filter="community" aria-pressed="false">${t('Community', 'Comunidad')}</button></div><div class="results-caption"><span id="network-count"></span><span class="sample-label">${t('SAMPLE LOCATIONS', 'LUGARES DE EJEMPLO')}</span></div><div id="network-results" class="network-results"></div><p class="network-note">${t('Explore the experience. Provider locations and appointments are illustrative.', 'Explora la experiencia. Los lugares y las citas son ilustrativos.')}</p></aside>
    <div class="network-canvas"><div id="network-map" aria-label="${t('Interactive South Florida network map', 'Mapa interactivo de la red del sur de Florida')}" role="region"></div><div class="map-top-controls"><div class="map-style-control"><button type="button" data-map-style="dark" class="selected">${t('Dark', 'Oscuro')}</button><button type="button" data-map-style="street">${t('Street', 'Calles')}</button></div><button type="button" class="button map-fit" id="map-fit">${icon('network')}${t('All locations', 'Todos los lugares')}</button></div><div id="map-status" class="map-status" role="status"></div><div class="map-legend"><i></i>${t('Legal access', 'Acceso legal')}<i class="community-dot"></i>${t('Community', 'Comunidad')}</div><div id="location-detail" class="location-detail" hidden></div></div>
  </section>
  <section class="product-screen padded-screen" data-screen="documents" hidden>
    ${title('02', 'YOUR DOCUMENTS'.replace('YOUR DOCUMENTS', t('YOUR DOCUMENTS', 'TUS DOCUMENTOS')), t('Your documents', 'Tus documentos'), t('Keep important records together and easy to find.', 'Reúne tus documentos importantes para encontrarlos fácilmente.'), `<button type="button" class="button primary" data-dialog="upload">${icon('plus')}${t('Add document', 'Añadir documento')}</button>`)}
    <div class="document-layout"><div class="document-main"><div class="folder-strip">${documentCategories
      .slice(0, 4)
      .map(
        (cat) =>
          `<button type="button" class="folder-button" data-doc-filter="${cat.id}"><span class="folder-art"><i></i><i></i><b>${icon('file')}</b></span><strong>${t(cat.en, cat.es)}</strong><small data-folder-count="${cat.id}"></small></button>`,
      )
      .join(
        '',
      )}</div><div class="section-line"><h2 id="document-list-title">${t('All documents', 'Todos los documentos')}</h2><button class="text-action" type="button" data-doc-filter="all">${t('View all', 'Ver todos')}${icon('arrow')}</button></div><label class="search-field document-search">${icon('search')}<input type="search" id="document-search" aria-label="${t('Search documents', 'Buscar documentos')}" placeholder="${t('Find a document', 'Encontrar un documento')}"></label><div class="file-table-head"><span>${t('DOCUMENT', 'DOCUMENTO')}</span><span>${t('TYPE', 'TIPO')}</span><span>${t('SIZE', 'TAMAÑO')}</span><span></span></div><div id="document-rows"></div><div class="drop-area" id="document-drop">${icon('upload')}<span>${t('Drop a file here, or', 'Suelta un archivo aquí, o')} <button type="button" data-dialog="upload">${t('choose a file', 'elige un archivo')}</button></span><small>PDF, JPG, PNG, TXT · 10 MB ${t('maximum · This device only', 'máximo · Solo en este dispositivo')}</small></div></div><aside class="preparation-aside"><p class="eyebrow">${t('DOCUMENT CHECKLIST', 'LISTA DE DOCUMENTOS')}</p><div class="readiness-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44"/><circle id="readiness-ring-progress" cx="50" cy="50" r="44" pathLength="100"/></svg><strong id="readiness-percent">40<span>%</span></strong></div><h2>${t('Your document checklist', 'Tu lista de documentos')}</h2><p>${t('Keep the records that matter together. Your attorney can help decide what you need.', 'Reúne los registros importantes. Tu abogado puede ayudarte a decidir cuáles necesitas.')}</p><div id="preparation-list"></div>${route('assistant', t('Ask Amparo AI', 'Preguntar a Amparo AI'), 'assistant', 'button quiet full')}<small class="session-note">${t('Demo files stay in this tab and reset when you reload.', 'Los archivos de la demo permanecen en esta pestaña y se borran al recargar.')}</small></aside></div>
  </section>
  <section class="product-screen assistant-screen" data-screen="assistant" hidden>
    <aside class="assistant-context"><div class="ai-wordmark">${icon('assistant')}<strong>Amparo AI</strong><span class="sample-label">DEMO</span></div><p class="page-description">${t('Questions about your documents, family plan or legal support.', 'Preguntas sobre documentos, tu plan familiar o ayuda legal.')}</p><button type="button" class="button quiet full" id="new-chat">${icon('plus')}${t('New conversation', 'Nueva conversación')}</button><p class="eyebrow context-label">${t('YOUR CONNECTED SPACE', 'TU ESPACIO CONECTADO')}</p><button class="context-row" type="button" data-route="documents">${icon('documents')}<span>${t('Documents', 'Documentos')}<small id="ai-doc-count"></small></span>${icon('arrow')}</button><button class="context-row" type="button" data-route="circle">${icon('people')}<span>${t('Trusted circle', 'Círculo de confianza')}<small id="ai-contact-count"></small></span>${icon('arrow')}</button><button class="context-row" type="button" data-route="membership">${icon('card')}<span>${t('Membership', 'Membresía')}<small>$50 / ${t('month', 'mes')}</small></span>${icon('arrow')}</button><div class="ai-context-note">${icon('shield')}<p>${t('Guidance for the next step. Legal advice comes from your independent attorney.', 'Orientación para el siguiente paso. El asesoramiento legal viene de tu abogado independiente.')}</p></div></aside>
    <div class="assistant-conversation"><div class="assistant-mobile-title"><strong>Amparo AI</strong><span class="sample-label">DEMO</span><button class="icon-button" type="button" id="new-chat-mobile" aria-label="${t('New conversation', 'Nueva conversación')}">${icon('plus')}</button></div><div id="assistant-thread" class="assistant-thread" role="log" aria-live="polite"><div id="assistant-empty" class="assistant-empty"><div class="ai-orb"><i></i><i></i><span>${icon('assistant')}</span></div><p class="eyebrow">${t('HERE FOR YOUR NEXT STEP', 'AQUÍ PARA TU SIGUIENTE PASO')}</p><h1 tabindex="-1">${t('How can we help?', '¿En qué podemos ayudarte?')}</h1><p>${t('Ask about documents, family planning or finding legal help.', 'Pregunta sobre documentos, planes familiares o ayuda legal.')}</p><div class="prompt-grid">${[
      [t('Review my documents', 'Revisar mis documentos'), 'documents'],
      [t('Find legal help nearby', 'Encontrar ayuda legal cerca'), 'network'],
      [
        t('Walk through a family alert', 'Recorrer una alerta familiar'),
        'shield',
      ],
      [t('Explain my membership', 'Explicar mi membresía'), 'card'],
    ]
      .map(
        ([label, glyph]) =>
          `<button type="button" data-prompt="${escapeHTML(label)}">${icon(glyph)}<span>${label}</span>${icon('diagonal')}</button>`,
      )
      .join(
        '',
      )}</div></div></div><div class="composer-wrap"><p id="voice-status" role="status"></p><form id="assistant-form" class="assistant-composer"><button type="button" class="icon-button" data-dialog="upload" aria-label="${t('Add a document', 'Añadir un documento')}">${icon('plus')}</button><textarea rows="1" maxlength="1200" id="assistant-input" placeholder="${t('Ask about your next step…', 'Pregunta sobre tu siguiente paso…')}" aria-label="${t('Message Amparo AI', 'Mensaje para Amparo AI')}"></textarea><button type="button" class="icon-button" id="voice-demo" aria-label="${t('Preview voice input', 'Probar entrada de voz')}">${icon('mic')}</button><button type="submit" class="send-button" id="assistant-send" aria-label="${t('Send message', 'Enviar mensaje')}">${icon('send')}</button></form><p class="composer-note">${t('Interactive AI demo · No message leaves this device.', 'Demo interactiva de IA · Ningún mensaje sale de este dispositivo.')}</p></div></div>
  </section>
  <section class="product-screen padded-screen" data-screen="circle" hidden>
    ${title('03', t('YOUR FAMILY SPACE', 'TU ESPACIO FAMILIAR'), t('Your family plan', 'Tu plan familiar'), t('Choose your contacts and prepare for an emergency together.', 'Elige tus contactos y preparen juntos un plan de emergencia.'), `<button class="button primary" type="button" data-dialog="contact">${icon('plus')}${t('Add a person', 'Añadir una persona')}</button>`)}
    <div id="family-progress"></div>
    <div class="circle-layout"><div><div class="section-line"><h2>${t('Your trusted circle', 'Tu círculo de confianza')}</h2><span class="sample-label">${t('SAMPLE CONTACTS', 'CONTACTOS DE EJEMPLO')}</span></div><div id="contact-cards" class="contact-cards"></div><div class="family-plan"><p class="eyebrow">${t('A PLAN WORTH SHARING', 'UN PLAN PARA COMPARTIR')}</p><h2>${t('Know the next step.<br>Before you need it.', 'Conoce el siguiente paso.<br>Antes de necesitarlo.')}</h2><p>${t('Choose who to contact, keep important records together, and talk through the plan as a family.', 'Elige a quién contactar, reúne los registros importantes y repasa el plan en familia.')}</p><div class="family-plan-actions"><button class="button primary" type="button" data-dialog="alert">${icon('shield')}${t('Practice a family alert', 'Practicar una alerta')}</button><button class="button quiet" type="button" data-action="download-plan">${icon('download')}${t('Download my plan', 'Descargar mi plan')}</button></div></div></div><aside class="activity-aside"><div class="section-line"><h2>${t('Your next steps', 'Tus siguientes pasos')}</h2>${icon('clock')}</div><div class="next-step"><span>01</span><div><strong>${t('Organize your records', 'Organiza tus registros')}</strong><p>${t('Build your document space.', 'Prepara tu espacio de documentos.')}</p>${route('documents', t('Open documents', 'Abrir documentos'))}</div></div><div class="next-step"><span>02</span><div><strong>${t('Talk it through', 'Hablen del plan')}</strong><p>${t('Make sure your circle knows the plan.', 'Asegúrate de que tu círculo conozca el plan.')}</p><button type="button" class="text-action" data-dialog="share">${t('Share an introduction', 'Compartir una introducción')}${icon('arrow')}</button></div></div><div class="next-step"><span>03</span><div><strong>${t('Know who to ask', 'Sabe a quién preguntar')}</strong><p>${t('Understand your legal access options.', 'Conoce tus opciones de acceso legal.')}</p>${route('network', t('Explore the network', 'Explorar la red'))}</div></div><div class="section-line activity-heading"><h2>${t('Recent activity', 'Actividad reciente')}</h2></div><ol id="activity-list" class="activity-list"></ol></aside></div>
  </section>
  <section class="product-screen padded-screen" data-screen="membership" hidden>
    ${title('04', t('YOUR MEMBERSHIP', 'TU MEMBRESÍA'), t('Membership', 'Membresía'), t('Know what is included, and what is separate.', 'Conoce lo que está incluido y lo que es aparte.'))}
    <div class="membership-layout"><div><div class="membership-card"><div class="member-card-top"><strong>amparo<span>®</span></strong>${icon('shield')}</div><p>${t('FLORIDA ACCESS MEMBERSHIP', 'MEMBRESÍA DE ACCESO FLORIDA')}</p><div class="member-card-bottom"><span><small>${t('MEMBER', 'MIEMBRO')}</small><strong id="card-member-name">${escapeHTML(state.name)} Rodriguez</strong></span><span class="sample-label">DEMO · 0048</span></div><div class="card-contours" aria-hidden="true"></div></div><div class="membership-price"><span><strong>$50</strong> / ${t('month', 'mes')}</span><span id="membership-label" class="sample-label"></span></div><button type="button" id="membership-checkout" class="button primary full" data-dialog="checkout">${t('Explore signup & checkout', 'Explorar inscripción y pago')}${icon('arrow')}</button><p class="session-note">${t('Use the sample account and card. Demo charge: $0.', 'Usa la cuenta y tarjeta de ejemplo. Cargo de la demo: $0.')}</p></div><div class="membership-details"><h2>${t('Included in your plan', 'Incluido en tu plan')}</h2>${[
      [
        t('Document organization', 'Organización de documentos'),
        t(
          'Your records, categorized and easy to find.',
          'Tus registros, organizados y fáciles de encontrar.',
        ),
      ],
      [
        t('Your trusted circle', 'Tu círculo de confianza'),
        t(
          'A shared preparation plan for the people you trust.',
          'Un plan compartido con las personas de confianza.',
        ),
      ],
      [
        t('Legal access & community', 'Acceso legal y comunidad'),
        t(
          'A clear path to explore independent legal support.',
          'Una forma clara de explorar apoyo legal independiente.',
        ),
      ],
      [
        t('Amparo AI', 'Amparo AI'),
        t(
          'Help navigating your next step and your Amparo space.',
          'Ayuda con tu siguiente paso y tu espacio Amparo.',
        ),
      ],
    ]
      .map(
        ([heading, body]) =>
          `<div class="included-row">${icon('check')}<span><strong>${heading}</strong><p>${body}</p></span></div>`,
      )
      .join(
        '',
      )}<div class="separate-costs"><h3>${t('Separate from membership', 'Aparte de la membresía')}</h3><p>${t('Attorney consultations, representation and bond payments are paid separately. Amparo is not a law firm. Membership does not guarantee release or a case outcome.', 'Las consultas, la representación legal y las fianzas se pagan aparte. Amparo no es un bufete. La membresía no garantiza la liberación ni el resultado de un caso.')}</p></div><button class="text-action" type="button" data-prompt="${t('Explain my membership', 'Explicar mi membresía')}">${t('Talk it through with Amparo AI', 'Consultar con Amparo AI')}${icon('assistant')}</button></div></div>
  </section>
  <section class="product-screen padded-screen" data-screen="more" hidden>
    ${title('05', t('YOUR AMPARO', 'TU AMPARO'), t('Account & settings', 'Cuenta y ajustes'), t('Manage your profile and preferences.', 'Administra tu perfil y tus preferencias.'))}
    <div class="more-layout"><div class="account-block"><span class="avatar account-avatar">MR</span><h2 id="account-name">${escapeHTML(state.name)} Rodriguez</h2><p id="account-email">${escapeHTML(state.email)}</p><span class="sample-label">${t('DEMO ACCOUNT', 'CUENTA DE EJEMPLO')}</span><button type="button" class="button quiet full" data-dialog="profile">${t('Edit profile', 'Editar perfil')}${icon('arrow')}</button><button type="button" class="text-action" data-dialog="onboarding">${t('Try signup / sign in', 'Probar registro / acceso')}${icon('diagonal')}</button></div><div class="more-links">${renderMoreRoutes(t, features)}<button type="button" class="settings-row" data-dialog="share">${icon('heart')}<span><strong>${t('Share Amparo', 'Comparte Amparo')}</strong><small>${t('Start a conversation with someone you care about', 'Habla con alguien que te importa')}</small></span>${icon('arrow')}</button><button type="button" class="settings-row" data-dialog="help">${icon('help')}<span><strong>${t('Help & questions', 'Ayuda y preguntas')}</strong><small>${t('How Amparo works', 'Cómo funciona Amparo')}</small></span>${icon('arrow')}</button><div class="settings-row">${icon('bell')}<span><strong>${t('Preparation reminders', 'Recordatorios de preparación')}</strong><small>${t('Your preference for the future live service', 'Tu preferencia para el futuro servicio')}</small></span><button type="button" class="switch" id="reminder-toggle" role="switch" aria-checked="true" aria-label="${t('Preparation reminders', 'Recordatorios de preparación')}"><i></i></button></div><button type="button" class="settings-row" data-action="theme">${icon('sun')}<span><strong>${t('Appearance', 'Apariencia')}</strong><small id="appearance-label"></small></span>${icon('arrow')}</button><div class="product-footer"><span>Amparo Access Network LLC</span><button type="button" data-dialog="privacy">${t('Privacy & this demo', 'Privacidad y esta demo')}</button><button type="button" data-dialog="reset">${t('Reset demo', 'Reiniciar demo')}</button></div></div></div>
  </section>`;
}

function renderMoreRoutes(t, features) {
  return [
    ...(features.communityAlerts
      ? [
          [
            'alerts',
            'alerts',
            t('Community alerts', 'Alertas comunitarias'),
            t(
              'Incident map, reports and statistics',
              'Mapa de incidentes, reportes y estadísticas',
            ),
          ],
        ]
      : []),
    [
      'network',
      'network',
      t('Find help', 'Buscar ayuda'),
      t(
        'Legal access and community support',
        'Acceso legal y apoyo comunitario',
      ),
    ],
    [
      'circle',
      'people',
      t('My family space', 'Mi espacio familiar'),
      t(
        'Contacts, preparation and activity',
        'Contactos, preparación y actividad',
      ),
    ],
    [
      'membership',
      'card',
      t('Membership & billing', 'Membresía y pagos'),
      t(
        'Your plan, with every detail upfront',
        'Tu plan, con todos los detalles',
      ),
    ],
  ]
    .map(
      ([name, glyph, heading, sub]) =>
        `<button type="button" class="settings-row" data-route="${name}">${icon(glyph)}<span><strong>${heading}</strong><small>${sub}</small></span>${icon('arrow')}</button>`,
    )
    .join('');
}
