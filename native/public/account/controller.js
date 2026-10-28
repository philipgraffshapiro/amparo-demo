import { accountView } from './views.js';

export class AccountController {
  constructor(app) {
    this.app = app;
    this.service = app.options.account?.service;
    this.session = null;
    this.membership = null;
    this.mode = 'signin';
    this.draft = {};
    this.generation = 0;
    this.setSession = (session, event) => {
      if (this.destroyed) return;
      this.captureForm();
      this.generation++;
      this.session = session;
      this.membership = null;
      if (!session) {
        this.mode = 'signin';
        this.draft = {};
      } else if (event === 'PASSWORD_RECOVERY') {
        this.mode = 'update-password';
        this.draft = {};
        this.open();
      } else if (event === 'SIGNED_IN') {
        this.draft = {};
      }
      this.render();
      if (session && this.service.billingEnabled) this.refresh = this.verify();
    };
    this.unsubscribe = this.service?.subscribe(this.setSession);
    this.ready = this.initialize();
  }
  async initialize() {
    const generation = this.generation;
    try {
      const session = await this.service?.initialize();
      if (!this.destroyed && generation === this.generation)
        this.setSession(session || null);
    } catch {
      this.status = 'failed';
      this.render();
    }
  }
  mount() {
    const document = this.app.document;
    for (const route of ['membership', 'more']) {
      const host = document.querySelector(`section[data-screen="${route}"]`);
      if (!host || host.querySelector('[data-account-action="open"]')) continue;
      const button = document.createElement('button');
      button.className = 'button quiet account-access-open';
      button.type = 'button';
      button.dataset.accountAction = 'open';
      button.textContent = this.app.text(
        'Account & payment status',
        'Cuenta y estado del pago',
      );
      host.querySelector('.screen-heading, .section-heading')?.after(button);
      if (!button.isConnected) host.prepend(button);
    }
    const dialog = document.createElement('dialog');
    dialog.id = 'account-access-dialog';
    dialog.setAttribute('aria-labelledby', 'account-access-title');
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      this.close();
    });
    document.body.append(dialog);
    this.render();
    if (this.isOpen) this.open();
  }
  captureForm() {
    const form = this.app.document.querySelector('#account-access-form');
    if (form)
      this.draft = Object.fromEntries(new this.app.window.FormData(form));
  }
  render() {
    const dialog = this.app.document.querySelector('#account-access-dialog');
    if (!dialog) return;
    const focused = dialog.contains(this.app.document.activeElement)
      ? this.app.document.activeElement.name
      : null;
    dialog.innerHTML = accountView(this);
    const form = dialog.querySelector('form');
    for (const [name, value] of Object.entries(this.draft)) {
      const field = form?.elements.namedItem(name);
      if (field) field.value = value;
    }
    if (focused) form?.elements.namedItem(focused)?.focus();
  }
  open() {
    if (!this.isOpen) this.opener = this.app.document.activeElement;
    this.isOpen = true;
    this.render();
    const dialog = this.app.document.querySelector('#account-access-dialog');
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute('open', '');
    dialog.querySelector('input,button')?.focus();
  }
  close() {
    const dialog = this.app.document.querySelector('#account-access-dialog');
    if (dialog.close) dialog.close();
    else dialog.removeAttribute('open');
    this.isOpen = false;
    this.draft = {};
    this.render();
    this.opener?.isConnected && this.opener.focus();
  }
  async verify() {
    const generation = this.generation;
    this.membership = null;
    try {
      const result = await this.service.membership();
      if (generation !== this.generation || this.destroyed) return;
      if (typeof result.active !== 'boolean' || result.mode !== 'test')
        throw new Error('Invalid membership');
      this.membership = result;
      this.status = '';
    } catch {
      if (generation === this.generation) this.status = 'verification';
    }
    this.render();
  }
  async submit(form) {
    if (this.busy || !form.reportValidity()) return;
    const values = Object.fromEntries(new this.app.window.FormData(form));
    await this.run(async () => {
      if (this.mode === 'recover') {
        await this.service.resetPassword(values.email);
        this.status = 'recovery-email';
      } else if (this.mode === 'update-password') {
        await this.service.updatePassword(values.password);
        this.draft = {};
        this.mode = 'signin';
        this.status = 'password-updated';
      } else if (values.mode === 'signup') {
        const result = await this.service.signUp(values.email, values.password);
        if (!result.session) this.status = 'email';
      } else await this.service.signIn(values.email, values.password);
    });
  }
  async delete(form) {
    if (this.busy || !this.service.deletionEnabled || !form.reportValidity())
      return;
    if (new this.app.window.FormData(form).get('confirmation') !== 'DELETE')
      return;
    await this.run(async () => {
      if (
        this.session?.user.identities?.some(
          (identity) => identity.provider === 'apple',
        )
      )
        await this.service.signInApple();
      await this.service.deleteAccount();
      this.setSession(null);
      this.close();
      this.app.reset();
      this.app.toast(this.app.text('Account deleted.', 'Cuenta eliminada.'));
    });
  }
  async run(operation) {
    if (this.busy) return;
    this.captureForm();
    this.busy = true;
    this.status = '';
    this.render();
    try {
      await operation();
    } catch (error) {
      this.status = [
        'reauthentication_required',
        'apple_reauthentication_required',
      ].includes(error.message)
        ? 'reauthenticate'
        : 'failed';
    } finally {
      this.busy = false;
      if (!this.destroyed) this.render();
    }
  }
  async action(action) {
    if (action === 'open') return this.open();
    if (action === 'close') return this.close();
    if (this.busy) return;
    if (action === 'recover' || action === 'signin') {
      this.captureForm();
      this.draft = { email: this.draft.email || '' };
      this.mode = action;
      this.status = '';
      this.render();
      return;
    }
    if (action === 'delete' && this.service.deletionEnabled) {
      this.mode = 'delete';
      this.render();
      return;
    }
    if (action === 'refresh') return (this.refresh = this.verify());
    await this.run(async () => {
      if (action === 'apple' && this.service.appleEnabled)
        await this.service.signInApple();
      if (action === 'google' && this.service.googleEnabled)
        await this.service.signInGoogle();
      if (action === 'signout') {
        await this.service.signOut();
        this.setSession(null);
      }
      if (action === 'passkey' && this.service.passkeys)
        await this.service.signInPasskey();
      if (action === 'register-passkey' && this.service.passkeys) {
        await this.service.registerPasskey();
        this.status = 'passkey';
      }
      if (
        ['checkout', 'portal'].includes(action) &&
        this.service.billingEnabled
      ) {
        this.requestKey ||= this.app.window.crypto.randomUUID();
        const result =
          action === 'checkout'
            ? await this.service.checkout(this.requestKey)
            : await this.service.portal();
        const url = new URL(result.url);
        const expected =
          action === 'checkout' ? 'checkout.stripe.com' : 'billing.stripe.com';
        if (
          url.protocol !== 'https:' ||
          url.hostname !== expected ||
          url.username ||
          url.password
        )
          throw new Error('Invalid Stripe URL');
        this.app.window.location.assign(url.href);
      }
    });
  }
  destroy() {
    this.destroyed = true;
    this.generation++;
    this.unsubscribe?.();
  }
}
