import { icon } from './product-icons.js';
import {
  localText,
  documentCategories,
  networkLocations,
} from './product-data.js';
import { DialogContent } from './dialogs/content.js';
class ProductDialogs {
  constructor(window, store, services, navigate, toast, animate) {
    Object.assign(this, { window, store, services, navigate, toast, animate });
    this.doc = window.document;
    this._current = '';
    this._payload = null;
    this.opener = null;
    this.timers = [];
    this.objectUrls = [];
    this.generation = 0;
    this.content = new DialogContent(store);
    for (const method of [
      'open',
      'close',
      'cleanup',
      'submit',
      'startAlert',
      'downloadDocument',
      'download',
    ])
      this[method] = this[method].bind(this);
  }
  t(en, es) {
    return localText(this.store.get().language, en, es);
  }
  cleanup() {
    this.generation++;
    this.timers.forEach((id) => this.window.clearTimeout(id));
    this.timers = [];
    for (const url of this.objectUrls) this.window.URL.revokeObjectURL(url);
    this.objectUrls = [];
  }
  get current() {
    return this._current;
  }
  get payload() {
    return this._payload;
  }
  open(kind, data) {
    const { toast } = this;
    this.cleanup();
    this._current = kind;
    this._payload = data;
    const dialog = this.doc.querySelector('#product-dialog');
    if (!dialog.open) this.opener = this.doc.activeElement;
    const [title, kicker, body] = this.content.render(kind, data);
    this.doc.querySelector('#dialog-content').innerHTML =
      `<button class="icon-button dialog-close" type="button" data-action="close-dialog" aria-label="${this.t('Close dialog', 'Cerrar diálogo')}">${icon('close')}</button><p class="eyebrow">${kicker}</p><h2 id="dialog-title">${title}</h2>${body}`;
    if (!dialog.open) {
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    dialog.scrollTop = 0;
    this.doc
      .querySelector(
        '#dialog-content input:not([type="file"]), #dialog-content button',
      )
      ?.focus();
    if (kind === 'upload' && data?.file) {
      const input = this.doc.querySelector('#document-file');
      try {
        const transfer = new this.window.DataTransfer();
        transfer.items.add(data.file);
        input.files = transfer.files;
      } catch {
        this._payload = { ...data, file: data.file };
      }
      this.doc.querySelector('[name="name"]').value = data.file.name;
    }
    if (kind === 'preview') {
      const file = this.store.getFile(data);
      if (file?.type.startsWith('image/')) {
        const url = this.window.URL.createObjectURL(file);
        this.objectUrls.push(url);
        this.doc.querySelector('#file-preview-body').innerHTML =
          `<img class="uploaded-preview" alt="${this.t('Selected document', 'Documento seleccionado')}" src="${url}">`;
      } else if (file?.type === 'text/plain' && file.text) {
        const active = this.generation;
        file
          .text()
          .then((value) => {
            if (this.generation !== active) return;
            const pre = this.doc.createElement('pre');
            pre.textContent = value.slice(0, 30000);
            this.doc.querySelector('#file-preview-body').replaceChildren(pre);
          })
          .catch(() =>
            toast(
              this.t(
                'Use Download to open this file.',
                'Usa Descargar para abrir este archivo.',
              ),
            ),
          );
      }
    }
  }
  close() {
    this.cleanup();
    const dialog = this.doc.querySelector('#product-dialog');
    if (dialog.open) {
      if (dialog.close) dialog.close();
      else dialog.removeAttribute('open');
    }
    this.opener?.isConnected && this.opener.focus();
    this._current = '';
  }
  async submit(formElement) {
    const { navigate, toast } = this;
    const formData = new this.window.FormData(formElement);
    const values = Object.fromEntries(formData);
    const submit = formElement.querySelector('[type="submit"]');
    if (submit?.disabled) return;
    try {
      if (this._current === 'upload') {
        const file =
          this.doc.querySelector('#document-file').files[0] ||
          this._payload?.file;
        const category = documentCategories.find(
          (cat) => cat.id === values.category,
        );
        this.store.addDocument(
          {
            name:
              values.name.trim() ||
              file?.name ||
              this.t(category.sample, category.sampleEs),
            category: values.category,
            sample: !file,
          },
          file,
        );
        this.close();
        navigate('documents');
        toast(
          this.t(
            'Document added to your space.',
            'Documento añadido a tu espacio.',
          ),
        );
      } else if (this._current === 'contact') {
        this.store.addContact(values);
        this.close();
        toast(
          this.t(
            'Your circle has a new person.',
            'Tu círculo tiene una persona más.',
          ),
        );
      } else if (this._current === 'profile') {
        this.store.update({
          name: values.name.trim(),
          city: values.city.trim(),
        });
        this.close();
        toast(
          this.t(
            'Profile saved for this session.',
            'Perfil guardado para esta sesión.',
          ),
        );
      } else if (this._current === 'onboarding') {
        this.store.update({
          name: values.name.trim(),
          email: values.email.trim(),
        });
        this.close();
        navigate('home');
        toast(
          this.t(
            'Welcome to your sample account.',
            'Bienvenido a tu cuenta de ejemplo.',
          ),
        );
      } else if (this._current === 'booking') {
        const place = networkLocations.find((p) => p.id === this._payload);
        const appointment = {
          ...values,
          name: this.t(place.name, place.es),
          locationId: place.id,
        };
        this.store.addAppointment(appointment);
        this.open('booking-success', appointment);
      } else if (this._current === 'checkout') {
        if (!formData.has('terms'))
          throw new Error(
            this.t(
              'Confirm the sample checkout details.',
              'Confirma los detalles del pago de ejemplo.',
            ),
          );
        submit.disabled = true;
        submit.textContent = this.t(
          'Preparing your membership…',
          'Preparando tu membresía…',
        );
        const active = this.generation;
        const result = await this.services.billing.checkout({
          planId: 'amparo-monthly',
          idempotencyKey: 'amparo-demo-membership',
        });
        await this.services.membership.activate({ checkoutId: result.id });
        if (active !== this.generation) return;
        this.store.update({
          name: values.name.trim(),
          email: values.email.trim(),
        });
        this.store.activateMembership();
        this.open('checkout');
      }
    } catch (error) {
      const errorBox = this.doc.querySelector('#form-error');
      if (errorBox) errorBox.textContent = error.message;
      if (submit) submit.disabled = false;
    }
  }
  async startAlert() {
    const button = this.doc.querySelector('#start-alert');
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = this.t(
      'Practicing your plan…',
      'Practicando tu plan…',
    );
    const active = this.generation;
    try {
      await this.services.alerts.simulate({ scenario: 'family-plan' });
      if (active !== this.generation) return;
      const advance = (index) => {
        if (active !== this.generation) return;
        this.doc
          .querySelectorAll('[data-alert-step]')
          .forEach((el, i) => el.classList.toggle('complete', i <= index));
        if (index === 2) {
          this.doc.querySelector('#alert-result').innerHTML =
            `<div class="alert-complete">${icon('check')}<strong>${this.t('Practice complete. No messages sent.', 'Práctica completa. No se enviaron mensajes.')}</strong><p>${this.t('Your contacts would receive a request to review the family plan. In the live service, delivery confirmation and an attorney contact would appear here.', 'Tus contactos recibirían una solicitud para revisar el plan. En el servicio real, aquí aparecerían la confirmación de entrega y un contacto legal.')}</p><button class="text-action" type="button" data-dialog-route="network">${this.t('Explore legal access', 'Explorar acceso legal')}${icon('arrow')}</button></div>`;
          button.textContent = this.t('Practice again', 'Practicar otra vez');
          button.disabled = false;
          this.store.log(
            'Family alert practice completed. No messages sent.',
            'Práctica de alerta completada. Sin mensajes enviados.',
          );
        }
      };
      this.doc.querySelector('#alert-result').textContent = '';
      this.doc
        .querySelectorAll('[data-alert-step]')
        .forEach((el) => el.classList.remove('complete'));
      for (let index = 0; index < 3; index++) {
        if (this.animate)
          this.timers.push(
            this.window.setTimeout(() => advance(index), 400 + index * 900),
          );
        else advance(index);
      }
    } catch {
      if (active !== this.generation) return;
      button.disabled = false;
      button.textContent = this.t(
        'Try the practice again',
        'Intentar la práctica otra vez',
      );
      this.doc.querySelector('#alert-result').textContent = this.t(
        'The simulation could not start. Please try again.',
        'No se pudo iniciar la simulación. Intenta otra vez.',
      );
    }
  }
  downloadDocument(id) {
    const item = this.store.get().documents.find((d) => d.id === id);
    const file = this.store.getFile(id);
    this.download(
      file ||
        `AMPARO / SAMPLE RECORD\n${item.name}\n\nPrepared for ${this.store.get().name}.\nThis is an illustrative document. No identity or legal claim is made.`,
      file?.name || `${item.name}.txt`,
    );
  }
  download(value, name, type = 'text/plain') {
    const { toast } = this;
    const blob =
      value instanceof this.window.Blob
        ? value
        : new this.window.Blob([value], { type });
    const url = this.window.URL.createObjectURL(blob);
    const anchor = this.doc.createElement('a');
    anchor.href = url;
    anchor.download = name;
    this.doc.body.append(anchor);
    anchor.click();
    anchor.remove();
    this.window.setTimeout(() => this.window.URL.revokeObjectURL(url), 1000);
    toast(this.t('Download prepared.', 'Descarga preparada.'));
  }
}
export function createProductDialogs(
  window,
  store,
  services,
  navigate,
  toast,
  animate = true,
) {
  return new ProductDialogs(window, store, services, navigate, toast, animate);
}
