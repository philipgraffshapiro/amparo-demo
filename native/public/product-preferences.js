const preferenceKey = 'amparo-product-v2';

export function readPreferences(window) {
  try {
    return {
      ok: true,
      value: JSON.parse(window.localStorage.getItem(preferenceKey) || 'null'),
    };
  } catch (error) {
    return { ok: false, error: { operation: 'read', reason: error.name } };
  }
}

export function writePreferences(window, state) {
  try {
    window.localStorage.setItem(
      preferenceKey,
      JSON.stringify({
        version: 2,
        language: state.language,
        theme: state.theme,
        notifications: state.notifications,
        reminders: state.reminders,
      }),
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, error: { operation: 'write', reason: error.name } };
  }
}
