import { icon } from '../product-icons.js';
import {
  escapeHTML,
  localText,
  documentCategories,
  networkLocations,
} from '../product-data.js';
const field = (label, name, value = '', type = 'text', extra = '') =>
  `<label class="form-field">${label}<input name="${name}" type="${type}" value="${escapeHTML(value)}" ${extra}></label>`;
const button = (text, id = '', extra = '') =>
  `<button type="submit" class="button primary full" ${id ? `id="${id}"` : ''} ${extra}>${text}${icon('arrow')}</button>`;
const form = (body) =>
  `<form id="product-dialog-form">${body}<p id="form-error" class="form-error" role="alert"></p></form>`;
const sampleNote = (t) =>
  `<p class="session-note">${t('Interactive demo. Your information stays in this tab.', 'Demo interactiva. Tu información permanece en esta pestaña.')}</p>`;
export class DialogContent {
  constructor(store) {
    this.store = store;
    this.t = (en, es) => localText(store.get().language, en, es);
  }
  render(kind, data) {
    const state = this.store.get();
    if (kind === 'upload') return this.upload(data);
    if (kind === 'contact') return this.contact();
    if (kind === 'profile') return this.profile(state);
    if (kind === 'onboarding') return this.onboarding(state);
    if (kind === 'checkout' && state.membership === 'active')
      return this.receipt();
    if (kind === 'checkout') return this.checkout(state);
    if (kind === 'booking') return this.booking(state, data);
    if (kind === 'booking-success') return this.bookingSuccess(data);
    if (kind === 'share') return this.share();
    if (kind === 'help') return this.help();
    if (kind === 'privacy') return this.privacy();
    if (kind === 'reset') return this.reset();
    if (kind === 'alert') return this.alert(state);
    if (kind === 'preview') return this.preview(state, data);
    return [this.t('Your next step', 'Tu siguiente paso'), 'AMPARO', ''];
  }
  upload(data) {
    const t = this.t;
    return [
      t('A place for what matters.', 'Un lugar para lo importante.'),
      t('ADD A DOCUMENT', 'AÑADIR DOCUMENTO'),
      form(
        `<label class="form-field">${t('Category', 'Categoría')}<select name="category">${documentCategories.map((cat) => `<option value="${cat.id}" ${data?.category === cat.id ? 'selected' : ''}>${t(cat.en, cat.es)}</option>`).join('')}</select></label>${field(t('Document name', 'Nombre del documento'), 'name', '', 'text', `maxlength="120" placeholder="${t('e.g. Identity record', 'p. ej. Registro de identidad')}"`)}<label class="file-upload-control">${icon('upload')}<strong>${t('Choose a file from this device', 'Elige un archivo de este dispositivo')}</strong><small>PDF, JPG, PNG, TXT · 10 MB</small><input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.txt" aria-label="${t('Choose document file', 'Elegir archivo')}" id="document-file"></label><p class="session-note">${t('Or leave the file empty to create a sample. Files disappear when you reload.', 'O deja el archivo vacío para crear un ejemplo. Los archivos se borran al recargar.')}</p>${button(t('Add to my documents', 'Añadir a mis documentos'))}`,
      ),
    ];
  }
  contact() {
    const t = this.t;
    return [
      t('Your people, closer.', 'Tu gente, más cerca.'),
      t('ADD TO YOUR CIRCLE', 'AÑADIR A TU CÍRCULO'),
      form(
        `${field(t('Full name', 'Nombre completo'), 'name', '', 'text', 'required maxlength="60" autocomplete="off"')}${field(t('Relationship', 'Relación'), 'relation', '', 'text', `maxlength="40" placeholder="${t('e.g. Sister, friend, partner', 'p. ej. Hermana, amigo, pareja')}"`)}${field(t('Phone number (optional)', 'Teléfono (opcional)'), 'phone', '', 'tel', 'maxlength="30" autocomplete="off"')}${sampleNote(t)}${button(t('Add trusted person', 'Añadir persona de confianza'))}`,
      ),
    ];
  }
  profile(state) {
    const t = this.t;
    return [
      t('Make yourself at home.', 'Siéntete en casa.'),
      t('YOUR PROFILE', 'TU PERFIL'),
      form(
        `${field(t('Your name', 'Tu nombre'), 'name', state.name, 'text', 'required maxlength="60"')}${field(t('Your city', 'Tu ciudad'), 'city', state.city, 'text', 'required maxlength="60"')}${sampleNote(t)}${button(t('Save profile', 'Guardar perfil'))}`,
      ),
    ];
  }
  onboarding(state) {
    const t = this.t;
    return [
      t('A little more prepared.', 'Un poco más preparado.'),
      t('WELCOME TO AMPARO', 'BIENVENIDO A AMPARO'),
      `<div class="onboarding-illustration">${icon('shield')}<span class="orbit-dot"></span></div><div class="onboarding-tabs"><button type="button" class="selected" data-account-mode="signup">${t('Create account', 'Crear cuenta')}</button><button type="button" data-account-mode="signin">${t('Sign in', 'Iniciar sesión')}</button></div>${form(`${field(t('Your name', 'Tu nombre'), 'name', state.name, 'text', 'required maxlength="60"')}${field(t('Email', 'Correo electrónico'), 'email', state.email, 'email', 'required autocomplete="off"')}<p class="session-note" id="account-mode-note">${t('Sample signup. No password or real account is created.', 'Registro de ejemplo. No se crea una contraseña ni una cuenta real.')}</p>${button(t('Continue into my space', 'Entrar a mi espacio'))}`)}`,
    ];
  }
  receipt() {
    const t = this.t;
    return [
      'Thank you. Gracias.',
      t('YOUR SAMPLE RECEIPT', 'TU RECIBO DE EJEMPLO'),
      `<div class="success-medallion">${icon('check')}</div><div class="receipt-line"><span>Amparo</span><strong>${t('Demo active', 'Demo activa')}</strong></div><div class="receipt-line"><span>${t('Monthly plan', 'Plan mensual')}</span><strong>$50.00</strong></div><div class="receipt-line total"><span>${t('Charged today', 'Cargo de hoy')}</span><strong>$0.00</strong></div><p>${t('You completed the full sample checkout. No payment was made and no live membership was created.', 'Completaste el pago de ejemplo. No hubo un pago ni se creó una membresía real.')}</p><button type="button" class="button primary full" data-dialog-route="circle">${t('Go to my family space', 'Ir a mi espacio familiar')}${icon('arrow')}</button>`,
    ];
  }
  checkout(state) {
    const t = this.t;
    return [
      t('Your next step starts here.', 'Tu siguiente paso empieza aquí.'),
      t('MEMBERSHIP / SAMPLE CHECKOUT', 'MEMBRESÍA / PAGO DE EJEMPLO'),
      form(
        `<div class="checkout-summary"><span>${icon('shield')} Amparo Access</span><strong>$50 <small>/ ${t('month', 'mes')}</small></strong></div>${field(t('Name on membership', 'Nombre del miembro'), 'name', state.name, 'text', 'required maxlength="60"')}${field(t('Email', 'Correo electrónico'), 'email', state.email, 'email', 'required')}<div class="sample-card-input">${icon('card')}<span><small>${t('SAMPLE CARD', 'TARJETA DE EJEMPLO')}</small>4242 &nbsp; 4242 &nbsp; 4242 &nbsp; 4242</span>${icon('check')}</div><div class="receipt-line total"><span>${t('Demo charge today', 'Cargo de la demo hoy')}</span><strong>$0.00</strong></div><label class="checkbox-field"><input type="checkbox" name="terms" required><span>${t('I understand this is a sample checkout. The proposed live plan is $50/month. Attorney fees and bond are separate.', 'Entiendo que es un pago de ejemplo. El plan propuesto cuesta $50/mes. Los honorarios legales y las fianzas son aparte.')}</span></label>${button(t('Complete sample checkout', 'Completar pago de ejemplo'), 'confirm-checkout')}`,
      ),
    ];
  }
  booking(state, data) {
    const t = this.t;
    const place = networkLocations.find((p) => p.id === data);
    const dates = [1, 2, 3].map((offset) => {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      return {
        value: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString(
          state.language === 'es' ? 'es-US' : 'en-US',
          { weekday: 'short', month: 'short', day: 'numeric' },
        ),
      };
    });
    return [
      t('Make time for clarity.', 'Un momento para aclarar.'),
      t('SAMPLE CONSULTATION', 'CONSULTA DE EJEMPLO'),
      form(
        `<p>${escapeHTML(t(place.name, place.es))} · ${place.city}</p><label class="form-field">${t('Choose a day', 'Elige un día')}<select name="date">${dates.map((day) => `<option value="${day.value}">${day.label}</option>`).join('')}</select></label><label class="form-field">${t('Choose a time', 'Elige una hora')}<select name="time"><option>10:00 AM ET</option><option>1:30 PM ET</option><option>3:00 PM ET</option></select></label><label class="form-field">${t('A note for the consultation (optional)', 'Nota para la consulta (opcional)')}<textarea name="note" maxlength="300" rows="3"></textarea></label><p class="session-note">${t('This plans a sample appointment. Nothing is sent to a provider.', 'Esto planifica una cita de ejemplo. No se envía nada a un proveedor.')}</p>${button(t('Plan sample consultation', 'Planificar consulta de ejemplo'))}`,
      ),
    ];
  }
  bookingSuccess(data) {
    const t = this.t;
    return [
      t(
        'A next step, on your calendar.',
        'Un siguiente paso en tu calendario.',
      ),
      t('SAMPLE APPOINTMENT PLANNED', 'CITA DE EJEMPLO PLANIFICADA'),
      `<div class="success-medallion">${icon('check')}</div><div class="appointment-ticket"><strong>${escapeHTML(data.name)}</strong><span>${escapeHTML(data.date)} · ${escapeHTML(data.time)}</span><small>${t('Sample only. No provider has received this request.', 'Solo un ejemplo. Ningún proveedor recibió esta solicitud.')}</small></div><button class="button primary full" type="button" data-action="download-appointment">${icon('download')}${t('Download sample calendar event', 'Descargar evento de ejemplo')}</button>`,
    ];
  }
  share() {
    const t = this.t;
    return [
      t('Start a conversation.', 'Empieza una conversación.'),
      t('SHARE AMPARO', 'COMPARTE AMPARO'),
      `<p>${t('An introduction you can copy and share yourself.', 'Una introducción que puedes copiar y compartir.')}</p><label class="form-field">${t('Your message', 'Tu mensaje')}<textarea id="share-text" rows="5">${t('I’m exploring Amparo, a family preparation and legal access concept. Take a look with me: documents, trusted contacts, and a plan we can talk through together. This is an interactive demo.', 'Estoy explorando Amparo, un concepto de preparación familiar y acceso legal. Veámoslo juntos: documentos, contactos de confianza y un plan para conversar. Es una demo interactiva.')}</textarea></label><button type="button" class="button primary full" data-action="copy-share">${icon('copy')}${t('Copy introduction', 'Copiar introducción')}</button>`,
    ];
  }
  help() {
    const t = this.t;
    return [
      t('A clearer answer.', 'Una respuesta más clara.'),
      t('HELP & QUESTIONS', 'AYUDA Y PREGUNTAS'),
      `<div class="help-questions">${[
        [
          t('What can I try here?', '¿Qué puedo probar aquí?'),
          t(
            'Explore the map, plan a consultation, organize files, add your circle, complete sample checkout, chat with the demo assistant and practice a family alert.',
            'Explora el mapa, planifica una consulta, organiza archivos, añade contactos, completa un pago de ejemplo, conversa con el asistente y practica una alerta.',
          ),
        ],
        [
          t('Is anything sent or charged?', '¿Se envía o cobra algo?'),
          t(
            'No payment is collected or alert sent. Membership, appointments and assistant replies are simulations. Account sign-in connects to Supabase and Google; news and map images load from external services.',
            'No se cobra ni se envían alertas. La membresía, las citas y el asistente son simulaciones. El acceso a cuentas conecta con Supabase y Google; las noticias y mapas usan servicios externos.',
          ),
        ],
        [
          t(
            'What does the proposed $50 plan cover?',
            '¿Qué incluye el plan propuesto de $50?',
          ),
          t(
            'Preparation tools, document organization, your trusted circle and access to the network. Attorney fees and bond payments are separate.',
            'Herramientas de preparación, documentos, contactos y acceso a la red. Los honorarios legales y las fianzas son aparte.',
          ),
        ],
      ]
        .map(
          ([question, answer]) =>
            `<details><summary>${question}${icon('plus')}</summary><p>${answer}</p></details>`,
        )
        .join(
          '',
        )}</div><button class="button quiet full" type="button" data-dialog-route="assistant">${t('Ask Amparo AI', 'Preguntar a Amparo AI')}${icon('assistant')}</button>`,
    ];
  }
  privacy() {
    const t = this.t;
    return [
      t('Your space, explained.', 'Tu espacio, explicado.'),
      t('PRIVACY & THIS DEMO', 'PRIVACIDAD Y ESTA DEMO'),
      `<div class="privacy-copy"><p>${t('Demo files, photos, contacts, reports and conversations stay in this browser tab and reset when you reload. Theme, language and reminder preferences may be saved on this device.', 'Los archivos, fotos, contactos, reportes y conversaciones de la demo permanecen en esta pestaña y se borran al recargar. El tema, idioma y recordatorios pueden guardarse en este dispositivo.')}</p><p>${t('Account sign-in uses Supabase and, if you choose it, Google. Your account and sign-in session persist separately from demo data. Passkeys never send your face scan or fingerprint to Amparo.', 'El acceso a cuentas usa Supabase y, si lo eliges, Google. La cuenta y sesión se conservan por separado de los datos de la demo. Las llaves de acceso nunca envían tu imagen facial ni huella a Amparo.')}</p><p>${t('GitHub Pages serves this site and public news; OpenStreetMap serves map images. Private uploads, billing and alert delivery are not active. Amparo is not a law firm or an emergency service.', 'GitHub Pages sirve el sitio y noticias públicas; OpenStreetMap sirve los mapas. Los archivos privados, pagos y envío de alertas no están activos. Amparo no es un bufete ni un servicio de emergencia.')}</p><a href="https://philipgraffshapiro.github.io/amparo-demo/privacy.html" target="_blank" rel="noopener">${t('Full privacy notice and account deletion contact', 'Aviso completo y contacto para eliminar tu cuenta')}</a></div>`,
    ];
  }
  reset() {
    const t = this.t;
    return [
      t('A fresh start?', '¿Empezamos de nuevo?'),
      t('RESET THIS DEMO', 'REINICIAR ESTA DEMO'),
      `<p>${t('This clears files, contacts, conversations and sample activity from this session. Your theme and language stay the same.', 'Esto borra archivos, contactos, conversaciones y actividad de ejemplo de esta sesión. El tema y el idioma se mantienen.')}</p><button type="button" class="button primary full" data-action="confirm-reset">${t('Reset my demo', 'Reiniciar mi demo')}${icon('arrow')}</button>`,
    ];
  }
  alert(state) {
    const t = this.t;
    return [
      t('A plan you can practice.', 'Un plan para practicar.'),
      t('FAMILY ALERT / SIMULATION', 'ALERTA FAMILIAR / SIMULACIÓN'),
      `<div class="alert-orbit">${icon('shield')}<i></i><i></i></div><p>${t('Walk through how your trusted circle would stay informed. This preview sends nothing and requests no emergency help.', 'Recorre cómo se informaría a tu círculo de confianza. Esta vista previa no envía nada ni solicita ayuda de emergencia.')}</p><div class="alert-steps" id="alert-steps"><div data-alert-step="0"><span>1</span><p><strong>${t('Review your plan', 'Revisar tu plan')}</strong><small>${t('Your people and documents, together', 'Tu gente y documentos, juntos')}</small></p></div><div data-alert-step="1"><span>2</span><p><strong>${t('Preview contact messages', 'Ver mensajes de ejemplo')}</strong><small>${state.contacts.length} ${t('people in your circle', 'personas en tu círculo')}</small></p></div><div data-alert-step="2"><span>3</span><p><strong>${t('Know the legal next step', 'Conocer el siguiente paso legal')}</strong><small>${t('Reach an independent attorney', 'Contactar a un abogado independiente')}</small></p></div></div><div id="alert-result" role="status"></div><button type="button" class="button primary full" id="start-alert">${t('Start the practice', 'Empezar la práctica')}${icon('arrow')}</button><p class="session-note">${t('For immediate danger, call 911. This demo cannot dispatch help.', 'Ante un peligro inmediato, llama al 911. Esta demo no puede enviar ayuda.')}</p>`,
    ];
  }
  preview(state, data) {
    const t = this.t;
    const item = state.documents.find((d) => d.id === data);
    return [
      escapeHTML(
        state.language === 'es' && item.nameEs ? item.nameEs : item.name,
      ),
      t('DOCUMENT PREVIEW', 'VISTA PREVIA DEL DOCUMENTO'),
      `<div id="file-preview-body" class="file-preview-body"><div class="sample-document"><div class="document-letterhead">amparo<span>${t('SAMPLE RECORD', 'REGISTRO DE EJEMPLO')}</span></div><h3>${escapeHTML(state.language === 'es' && item.nameEs ? item.nameEs : item.name)}</h3><p>${t('Prepared for', 'Preparado para')} ${escapeHTML(state.name)}</p><div class="paper-lines"><i></i><i></i><i></i></div><p>${item.sample ? t('This is a sample record for exploring your document space. Add your own file to try a local preview and download.', 'Este registro de ejemplo permite explorar tus documentos. Añade un archivo para probar una vista previa y descarga local.') : t('This file is held in this tab. Download it to open in your preferred viewer.', 'Este archivo permanece en esta pestaña. Descárgalo para abrirlo con tu visor.')}</p><div class="document-stamp">${icon('check')}${t('DEMO ONLY', 'SOLO DEMO')}</div></div></div><div class="dialog-actions"><button class="button primary" type="button" data-download-document="${item.id}">${icon('download')}${t('Download', 'Descargar')}</button><button type="button" class="button quiet" data-delete-document="${item.id}">${t('Remove', 'Eliminar')}${icon('close')}</button></div>`,
    ];
  }
}
