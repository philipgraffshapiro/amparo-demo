import { initialProductState } from './product-data.js';
import { readPreferences, writePreferences } from './product-preferences.js';

export function createProductStore(window) {
  let state = initialProductState();
  const listeners = new Set();
  const files = new Map();
  const loaded = readPreferences(window);
  let preferenceStorage = loaded.ok
    ? { status: 'available' }
    : { status: 'unavailable', ...loaded.error };
  if (loaded.ok) {
    const stored = loaded.value;
    if (stored?.version === 2) {
      state.language = stored.language === 'es' ? 'es' : 'en';
      state.theme = stored.theme === 'light' ? 'light' : 'dark';
      state.notifications = stored.notifications !== false;
      state.reminders = stored.reminders !== false;
    }
  }
  const emit = () => {
    const saved = writePreferences(window, state);
    preferenceStorage = saved.ok
      ? { status: 'saved' }
      : { status: 'unavailable', ...saved.error };
    for (const listener of listeners) listener();
  };
  const log = (en, es) => {
    state.activity.unshift({ en, es });
    state.activity = state.activity.slice(0, 12);
  };
  const uid = (prefix) =>
    `${prefix}-${window.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)}`;
  return {
    get: () => structuredClone(state),
    get preferenceStorage() {
      return { ...preferenceStorage };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(change) {
      state = { ...state, ...change };
      emit();
    },
    addDocument(item, file) {
      if (
        !['identity', 'family', 'residence', 'legal', 'other'].includes(
          item.category,
        )
      )
        throw new Error('Choose a document category');
      if (!String(item.name || '').trim())
        throw new Error('A document name is required');
      if (
        file &&
        (!['application/pdf', 'image/jpeg', 'image/png', 'text/plain'].includes(
          file.type,
        ) ||
          file.size > 10 * 1024 * 1024)
      )
        throw new Error('Use PDF, JPG, PNG or text up to 10 MB');
      const entry = {
        ...item,
        id: uid('doc'),
        name: String(item.name).trim().slice(0, 120),
        size: file?.size || item.size || 2200,
      };
      state.documents.push(entry);
      if (file) files.set(entry.id, file);
      log('Document added to your space.', 'Documento añadido a tu espacio.');
      emit();
      return entry.id;
    },
    removeDocument(id) {
      state.documents = state.documents.filter((item) => item.id !== id);
      files.delete(id);
      log('Document removed.', 'Documento eliminado.');
      emit();
    },
    getFile: (id) => files.get(id),
    addContact(item) {
      if (!String(item.name || '').trim())
        throw new Error('A contact name is required');
      const name = String(item.name).trim().slice(0, 60);
      state.contacts.push({
        ...item,
        id: uid('contact'),
        name,
        initials: name
          .split(/\s+/)
          .map((part) => part[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
      });
      log(
        'A person was added to your circle.',
        'Una persona fue añadida a tu círculo.',
      );
      emit();
    },
    removeContact(id) {
      state.contacts = state.contacts.filter((item) => item.id !== id);
      emit();
    },
    activateMembership() {
      state.membership = 'active';
      log(
        'Sample membership activated. No charge.',
        'Membresía de ejemplo activada. Sin cargo.',
      );
      emit();
    },
    addAppointment(item) {
      state.appointments.push({ ...item, id: uid('appointment'), demo: true });
      log(
        'A sample consultation was planned.',
        'Se planificó una consulta de ejemplo.',
      );
      emit();
    },
    log(en, es) {
      log(en, es);
      emit();
    },
    reset() {
      const { theme, language } = state;
      state = { ...initialProductState(), theme, language };
      files.clear();
      emit();
    },
  };
}
