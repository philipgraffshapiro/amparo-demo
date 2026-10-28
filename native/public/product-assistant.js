import { escapeHTML, localText } from './product-data.js';
import { icon } from './product-icons.js';

export function createProductAssistant(
  window,
  store,
  services,
  navigate,
  animate = true,
) {
  let messages = [],
    generation = 0,
    busy = false;
  const doc = window.document;
  const t = (en, es) => localText(store.get().language, en, es);
  function render() {
    const thread = doc.querySelector('#assistant-thread');
    const empty = doc.querySelector('#assistant-empty');
    if (empty) empty.hidden = messages.length > 0;
    thread.querySelectorAll('.chat-message').forEach((el) => el.remove());
    for (const message of messages) {
      const el = doc.createElement('article');
      el.className = `chat-message ${message.role}`;
      el.innerHTML = `<span class="chat-avatar">${message.role === 'assistant' ? icon('assistant') : escapeHTML(store.get().name.slice(0, 1))}</span><div><small>${message.role === 'assistant' ? 'AMPARO AI' : t('YOU', 'TÚ')}</small><p>${escapeHTML(message.content)}</p>${message.action ? `<button class="chat-action" type="button" data-ai-action="${message.action}">${escapeHTML(message.label)}${icon('arrow')}</button>` : ''}</div>`;
      thread.append(el);
    }
    if (busy) {
      const pending = doc.createElement('article');
      pending.className = 'chat-message assistant';
      pending.innerHTML = `<span class="chat-avatar">${icon('assistant')}</span><div class="thinking" aria-label="${t('Preparing a response', 'Preparando una respuesta')}"><i></i><i></i><i></i></div>`;
      thread.append(pending);
    }
    doc.querySelector('#assistant-send').disabled = busy;
    thread.scrollTop = thread.scrollHeight;
  }
  return {
    render,
    async send(value) {
      const message = String(value || '')
        .trim()
        .slice(0, 1200);
      if (!message || busy) return;
      navigate('assistant');
      messages.push({ role: 'user', content: message });
      busy = true;
      const current = ++generation;
      doc.querySelector('#assistant-input').value = '';
      render();
      try {
        if (animate)
          await new Promise((resolve) => window.setTimeout(resolve, 650));
        const reply = await services.assistant.respond({
          message,
          language: store.get().language,
          state: store.get(),
        });
        if (current !== generation) return;
        messages.push({ role: 'assistant', ...reply });
      } catch {
        if (current === generation)
          messages.push({
            role: 'assistant',
            content: t(
              'That response did not come through. Please try your question again.',
              'La respuesta no llegó. Intenta la pregunta otra vez.',
            ),
          });
      } finally {
        if (current === generation) {
          busy = false;
          render();
          doc.querySelector('#assistant-input').focus();
        }
      }
    },
    clear() {
      generation++;
      busy = false;
      messages = [];
      render();
      doc.querySelector('#assistant-input').focus();
    },
    voice() {
      doc.querySelector('#voice-status').textContent = t(
        'Voice preview: a sample question is ready to send.',
        'Vista previa de voz: hay una pregunta de ejemplo lista para enviar.',
      );
      doc.querySelector('#assistant-input').value = t(
        'Help me prepare my family documents',
        'Ayúdame a preparar los documentos de mi familia',
      );
      doc.querySelector('#assistant-input').focus();
    },
    destroy() {
      generation++;
    },
  };
}
