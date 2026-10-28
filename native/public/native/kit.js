const key = 'amparo.native.preparation.v1';
const tasks = [
  ['contact', 'Choose a trusted contact', 'Elige un contacto de confianza'],
  [
    'copies',
    'Keep copies of important documents',
    'Guarda copias de documentos importantes',
  ],
  ['appointment', 'Write down your next appointment', 'Anota tu próxima cita'],
  [
    'review',
    'Review your plan with your household',
    'Revisa el plan con tu familia',
  ],
];

export class NativeKit {
  constructor(app, bridge) {
    this.app = app;
    this.bridge = bridge;
    this.values = {};
    try {
      const saved = JSON.parse(app.window.localStorage.getItem(key) || '{}');
      for (const [id] of tasks) this.values[id] = saved?.[id] === true;
    } catch {
      this.storageFailed = true;
    }
    this.listener = (event) => {
      const target = event.target.closest('[data-native-action]');
      if (target)
        this.action(target.dataset.nativeAction).catch(() =>
          app.toast(
            app.text(
              'Could not finish. Check your device settings and try again.',
              'No se pudo completar. Revisa los ajustes del dispositivo e intenta otra vez.',
            ),
          ),
        );
    };
    app.document.addEventListener('click', this.listener);
  }
  mount() {
    const host = this.app.document.querySelector('[data-screen="more"]');
    if (!host) return;
    const t = this.app.text.bind(this.app);
    const section = this.app.document.createElement('section');
    section.className = 'native-kit';
    section.innerHTML = `<p class="eyebrow">${t('ON YOUR IPHONE', 'EN TU IPHONE')}</p>
      <h2>${t('Your preparation checklist', 'Tu lista de preparación')}</h2>
      <p>${t('Available offline. Checkmarks stay on this device. No document or contact information is stored here.', 'Disponible sin conexión. Las marcas se guardan en este dispositivo. No se guardan documentos ni datos de contactos aquí.')}</p>
      <div class="native-kit-tasks">${tasks.map(([id, en, es]) => `<label><input type="checkbox" data-native-task="${id}" ${this.values[id] ? 'checked' : ''}>${t(en, es)}</label>`).join('')}</div>
      <div class="native-kit-actions"><button class="button quiet" data-native-action="share">${t('Share checklist', 'Compartir lista')}</button>
      <button class="button quiet" data-native-action="remind">${t('Remind me tomorrow', 'Recordar mañana')}</button>
      <button class="button quiet" data-native-action="cancel">${t('Cancel reminder', 'Cancelar recordatorio')}</button>
      <button class="button quiet" data-native-action="clear">${t('Clear checklist', 'Borrar lista')}</button></div>
      <p class="session-note" role="status">${this.storageFailed ? t('Device storage is unavailable; changes cannot be saved.', 'El almacenamiento no está disponible; los cambios no se guardarán.') : ''}</p>`;
    section.addEventListener('change', (event) => {
      const id = event.target.dataset.nativeTask;
      if (!tasks.some(([value]) => value === id)) return;
      this.values[id] = event.target.checked;
      try {
        this.app.window.localStorage.setItem(key, JSON.stringify(this.values));
      } catch {
        section.querySelector('[role="status"]').textContent = t(
          'Could not save this change.',
          'No se pudo guardar este cambio.',
        );
      }
    });
    host.insertBefore(section, host.querySelector('.more-layout'));
  }
  async action(action) {
    const t = this.app.text.bind(this.app);
    if (action === 'share')
      await this.bridge.share({
        text: [
          'Amparo',
          ...tasks.map(
            ([id, en, es]) => `${this.values[id] ? '✓' : '○'} ${t(en, es)}`,
          ),
        ].join('\n'),
      });
    if (action === 'remind') {
      await this.bridge.remind({ language: this.app.store.get().language });
      this.app.toast(
        t('Reminder set for tomorrow.', 'Recordatorio programado para mañana.'),
      );
    }
    if (action === 'cancel') {
      await this.bridge.cancelReminder();
      this.app.toast(t('Reminder cancelled.', 'Recordatorio cancelado.'));
    }
    if (action === 'clear') {
      this.app.window.localStorage.removeItem(key);
      this.values = {};
      this.app.document
        .querySelectorAll('[data-native-task]')
        .forEach((input) => {
          input.checked = false;
        });
      this.app.toast(t('Checklist cleared.', 'Lista borrada.'));
    }
  }
  destroy() {
    this.app.document.removeEventListener('click', this.listener);
  }
}
