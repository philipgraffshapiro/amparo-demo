import { dispatchProductClick } from './product-actions.js';

export function bindProductEvents(app) {
  const { document, window } = app;
  const onClick = (event) => {
    dispatchProductClick(app, event).catch(() =>
      app.toast(
        app.text(
          'That action could not finish. Please try again.',
          'No se pudo completar la acción. Intenta otra vez.',
        ),
      ),
    );
  };
  const onSubmit = (event) => {
    if (event.target.id === 'account-delete-form') {
      event.preventDefault();
      app.account.delete(event.target);
    }
    if (event.target.id === 'account-access-form') {
      event.preventDefault();
      app.account.submit(event.target);
    }
    if (event.target.id === 'family-update-form') {
      event.preventDefault();
      app.family.submit(event.target);
    }
    if (event.target.id === 'community-report-form') {
      event.preventDefault();
      app.community.submit(event.target);
    }
    if (event.target.id === 'assistant-form') {
      event.preventDefault();
      app.assistant.send(document.querySelector('#assistant-input').value);
    }
    if (event.target.id === 'product-dialog-form') {
      event.preventDefault();
      app.dialogs.submit(event.target);
    }
  };
  const onInput = (event) => {
    if (event.target.id === 'report-photos') app.family.addPhotos(event.target);
    app.community?.input(event.target);
    if (event.target.id === 'network-search') {
      app.filters.networkQuery = event.target.value;
      app.updateNetwork();
    }
    if (event.target.id === 'document-search') {
      app.filters.documentQuery = event.target.value;
      app.renderState();
    }
  };
  const onKey = (event) => {
    if (event.key === 'Escape') {
      const menu = document.querySelector('.site-menu[open]');
      if (menu) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    }
    if (
      event.target.id === 'assistant-input' &&
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.isComposing
    ) {
      event.preventDefault();
      app.assistant.send(event.target.value);
    }
  };
  const onDrop = (event) => {
    const target = event.target.closest('#document-drop');
    if (!target) return;
    event.preventDefault();
    target.classList.remove('dragover');
    const file = event.dataTransfer.files[0];
    if (file) app.dialogs.open('upload', { file });
  };
  const onDrag = (event) => {
    const target = event.target.closest('#document-drop');
    if (!target) return;
    event.preventDefault();
    target.classList.add('dragover');
  };
  const onDragLeave = (event) =>
    event.target.closest('#document-drop')?.classList.remove('dragover');
  const onPop = () =>
    app.navigate(window.location.hash.slice(1), { history: false });
  const handlers = {
    click: onClick,
    submit: onSubmit,
    input: onInput,
    keydown: onKey,
    drop: onDrop,
    dragover: onDrag,
    dragleave: onDragLeave,
  };
  for (const [type, handler] of Object.entries(handlers))
    document.addEventListener(type, handler);
  window.addEventListener('popstate', onPop);
  return () => {
    for (const [type, handler] of Object.entries(handlers))
      document.removeEventListener(type, handler);
    window.removeEventListener('popstate', onPop);
  };
}
