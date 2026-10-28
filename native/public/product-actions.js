import { createAppointmentCalendar } from './product-calendar.js';

const dataActions = {
  accountAction: (app, button) =>
    app.account.action(button.dataset.accountAction),
  familyCase: (app, button) => app.family.select(button.dataset.familyCase),
  familyAction: (app, button) =>
    app.family.action(button.dataset.familyAction, button),
  communityAction: (app, button) =>
    app.community?.action(button.dataset.communityAction),
  communityTab: (app, button) =>
    app.community?.setTab(button.dataset.communityTab),
  communityReport: (app, button) =>
    app.community?.select(button.dataset.communityReport),
  communityFollow: (app, button) =>
    app.community?.follow(button.dataset.communityFollow),
  communityOpen(app, button) {
    app.community.closeDialog();
    app.community.select(button.dataset.communityOpen);
  },
  communityRegion(app, button) {
    app.community.filters.region = button.dataset.communityRegion;
    app.community.restoreFilters();
    app.community.render();
  },
  route: (app, button) => app.navigate(button.dataset.route),
  dialogRoute(app, button) {
    app.dialogs.close();
    app.navigate(button.dataset.dialogRoute);
  },
  dialog(app, button) {
    app.dialogs.open(button.dataset.dialog, {
      category:
        app.filters.document === 'all' ? 'identity' : app.filters.document,
    });
  },
  docFilter(app, button) {
    app.filters.document = button.dataset.docFilter;
    app.renderState();
  },
  networkFilter(app, button) {
    app.filters.network = button.dataset.networkFilter;
    app.document.querySelector('#location-detail').hidden = true;
    app.updateNetwork();
  },
  location: (app, button) => app.selectLocation(button.dataset.location),
  book: (app, button) => app.dialogs.open('booking', button.dataset.book),
  preview: (app, button) => app.dialogs.open('preview', button.dataset.preview),
  downloadDocument: (app, button) =>
    app.dialogs.downloadDocument(button.dataset.downloadDocument),
  deleteDocument(app, button) {
    app.store.removeDocument(button.dataset.deleteDocument);
    app.dialogs.close();
    app.toast(app.text('Document removed.', 'Documento eliminado.'));
  },
  removeContact(app, button) {
    app.store.removeContact(button.dataset.removeContact);
    app.toast(
      app.text(
        'Contact removed from this demo.',
        'Contacto eliminado de esta demo.',
      ),
    );
  },
  prompt: (app, button) => app.assistant.send(button.dataset.prompt),
  aiAction(app, button) {
    if (button.dataset.aiAction === 'alert') app.dialogs.open('alert');
    else app.navigate(button.dataset.aiAction);
  },
  mapStyle(app, button) {
    app.maps.style(button.dataset.mapStyle);
    app.document
      .querySelectorAll('[data-map-style]')
      .forEach((el) => el.classList.toggle('selected', el === button));
  },
  accountMode(app, button) {
    app.document
      .querySelectorAll('[data-account-mode]')
      .forEach((el) => el.classList.toggle('selected', el === button));
    app.document.querySelector('#account-mode-note').textContent =
      button.dataset.accountMode === 'signin'
        ? app.text(
            'Sample sign in. Continue to the local demo account.',
            'Acceso de ejemplo. Continúa a la cuenta de demo local.',
          )
        : app.text(
            'Sample signup. No password or real account is created.',
            'Registro de ejemplo. No se crea una contraseña ni una cuenta real.',
          );
  },
};

const controlActions = {
  'map-fit'(app) {
    app.maps.fit();
    app.document.querySelector('#location-detail').hidden = true;
  },
  'product-language'(app) {
    const route = app.current;
    app.store.update({
      language: app.store.get().language === 'en' ? 'es' : 'en',
    });
    app.build();
    app.navigate(route, { focus: false });
    app.reportPreferenceStorage();
  },
  'new-chat': (app) => app.assistant.clear(),
  'new-chat-mobile': (app) => app.assistant.clear(),
  'voice-demo': (app) => app.assistant.voice(),
  'start-alert': (app) => app.dialogs.startAlert(),
  'reminder-toggle'(app) {
    app.store.update({ reminders: !app.store.get().reminders });
    app.toast(app.text('Reminder preference saved.', 'Preferencia guardada.'));
    app.reportPreferenceStorage();
  },
};

async function copyIntroduction(app) {
  const field = app.document.querySelector('#share-text');
  try {
    await app.window.navigator.clipboard.writeText(field.value);
    app.toast(app.text('Introduction copied.', 'Introducción copiada.'));
  } catch {
    field.select();
    app.toast(
      app.text(
        'Select and copy the introduction.',
        'Selecciona y copia la introducción.',
      ),
    );
  }
}

function downloadPlan(app) {
  const state = app.store.get();
  app.dialogs.download(
    `${app.text('AMPARO / FAMILY PREPARATION PLAN', 'AMPARO / PLAN DE PREPARACIÓN FAMILIAR')}\n${state.name} · ${state.city}\n\n${app.text('TRUSTED CONTACTS', 'CONTACTOS DE CONFIANZA')}\n${state.contacts.map((p) => `${p.name} · ${p.relation || ''} · ${p.phone || ''}`).join('\n')}\n\n${app.text('DOCUMENTS', 'DOCUMENTOS')}\n${state.documents.map((d) => d.name).join('\n')}\n\n${app.text('Discuss your plan together. For immediate danger call 911. Contact an independent attorney for legal advice. This is a demo plan, not a dispatched alert.', 'Hablen del plan. Ante un peligro inmediato, llama al 911. Contacta a un abogado independiente para asesoramiento legal. Esto es un plan de demo, no una alerta enviada.')}`,
    'amparo-family-plan.txt',
  );
}

const namedActions = {
  theme(app) {
    app.store.update({
      theme: app.store.get().theme === 'dark' ? 'light' : 'dark',
    });
    app.reportPreferenceStorage();
  },
  'close-dialog': (app) => app.dialogs.close(),
  'close-location': (app) => app.closeLocation(),
  'clear-network'(app) {
    app.filters.network = 'all';
    app.filters.networkQuery = '';
    app.document.querySelector('#network-search').value = '';
    app.updateNetwork();
  },
  'confirm-reset': (app) => app.reset(),
  'copy-share': copyIntroduction,
  'download-plan': downloadPlan,
  'download-appointment'(app) {
    app.dialogs.download(
      createAppointmentCalendar(app.dialogs.payload),
      'amparo-sample-appointment.ics',
      'text/calendar',
    );
  },
};

export async function dispatchProductClick(app, event) {
  const button = event.target.closest('button, a[data-route]');
  if (!button) return;
  if (button.matches('a')) {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      event.button > 0
    )
      return;
    event.preventDefault();
  }
  const entry = Object.entries(dataActions).find(
    ([key]) => button.dataset[key],
  );
  const handler =
    entry?.[1] ||
    controlActions[button.id] ||
    namedActions[button.dataset.action];
  if (handler) await handler(app, button);
}
