import { escapeHTML } from '../product-data.js';

function accessForm(controller, t, button) {
  const { mode, busy, service } = controller;
  const recovering = mode === 'recover';
  const updating = mode === 'update-password';
  const label = recovering
    ? t('Send reset link', 'Enviar enlace')
    : updating
      ? t('Save new password', 'Guardar contraseña')
      : t('Continue', 'Continuar');
  return `<form id="account-access-form">
    ${updating ? '' : `<label class="form-field">${t('Email', 'Correo electrónico')}<input name="email" type="email" required maxlength="254" autocomplete="username webauthn"></label>`}
    ${recovering ? '' : `<label class="form-field">${updating ? t('New password', 'Contraseña nueva') : t('Password', 'Contraseña')}<input name="password" type="password" required minlength="8" maxlength="128" autocomplete="${updating ? 'new-password' : 'current-password'}"></label>`}
    ${recovering || updating ? '' : `<label class="form-field">${t('Action', 'Acción')}<select name="mode"><option value="signin">${t('Sign in', 'Entrar')}</option><option value="signup" ${service?.signupEnabled ? '' : 'disabled'}>${t('Create account', 'Crear cuenta')}</option></select></label>`}
    <button class="button primary full" type="submit" ${busy || !service?.available ? 'disabled' : ''}>${label}</button></form>
    <div class="account-access-actions">${
      recovering
        ? button('signin', t('Back to sign in', 'Volver a entrar'))
        : updating
          ? ''
          : `${button('recover', t('Forgot password?', '¿Olvidaste tu contraseña?'))}
          ${service?.appleEnabled ? button('apple', t('Sign in with Apple', 'Iniciar sesión con Apple')) : ''}
          ${service?.googleEnabled ? button('google', t('Continue with Google', 'Continuar con Google')) : ''}
          ${button('passkey', t('Sign in with Face ID / passkey', 'Entrar con Face ID / llave de acceso'), !service?.passkeys)}`
    }</div>${recovering ? `<p class="session-note">${t('Password reset emails are currently limited to invited demo accounts. If you joined with Google, continue with Google and recover your Google account there if needed.', 'Los correos para restablecer contraseñas están limitados a cuentas invitadas de la demo. Si te registraste con Google, continúa con Google y recupera tu cuenta allí si es necesario.')}</p>` : ''}`;
}

export function accountView(controller) {
  const { app, session, service, membership, busy, status } = controller;
  const t = (en, es) => app.text(en, es);
  const button = (action, label, disabled = false) =>
    `<button type="button" class="button quiet${action === 'apple' ? ' apple-sign-in' : ''}" data-account-action="${action}" ${busy || disabled ? 'disabled' : ''}>${label}</button>`;
  const notices = {
    reauthenticate: t(
      'For your protection, sign out and sign in again, then retry deletion.',
      'Por tu seguridad, cierra sesión y vuelve a entrar; después intenta eliminar la cuenta.',
    ),
    failed: t(
      'Could not finish. Check your details and connection, then try again.',
      'No se pudo completar. Revisa tus datos y conexión e intenta otra vez.',
    ),
    verification: t(
      'No membership could be verified. Try refreshing.',
      'No se pudo verificar la membresía. Intenta actualizar.',
    ),
    email: t(
      'Check your email to confirm your account before signing in.',
      'Revisa tu correo para confirmar tu cuenta antes de entrar.',
    ),
    passkey: t(
      'Passkey added. Keep another sign-in method available.',
      'Llave de acceso añadida. Conserva otro método de acceso.',
    ),
    'recovery-email': t(
      'If an account exists for this email, check your inbox for a reset link. Open it in this browser.',
      'Si existe una cuenta con este correo, revisa tu bandeja de entrada. Abre el enlace en este navegador.',
    ),
    'password-updated': t('Password updated.', 'Contraseña actualizada.'),
  };
  const updating = controller.mode === 'update-password';
  if (controller.mode === 'delete' && session)
    return `<h2 id="account-access-title">${t('Delete your account?', '¿Eliminar tu cuenta?')}</h2>
    <p>${t('This permanently deletes your account, profile, subscriptions, submitted reports, uploaded photos and family cases you own, including shared access to those cases. This cannot be undone.', 'Esto elimina permanentemente tu cuenta, perfil, suscripciones, reportes, fotos y los casos familiares que te pertenecen, incluido el acceso compartido. No se puede deshacer.')}</p>
    <form id="account-delete-form"><label class="form-field">${t('Type DELETE to confirm', 'Escribe DELETE para confirmar')}<input name="confirmation" required pattern="DELETE" autocomplete="off" autocapitalize="characters"></label>
    <button type="submit" class="button quiet" id="account-delete-confirm" ${busy ? 'disabled' : ''}>${t('Delete account permanently', 'Eliminar cuenta permanentemente')}</button></form>
    ${button('signin', t('Keep my account', 'Conservar mi cuenta'))}
    <p role="status">${busy ? t('Deleting…', 'Eliminando…') : notices[status] || ''}</p>`;

  const heading = updating
    ? t('Choose a new password.', 'Elige una contraseña nueva.')
    : controller.mode === 'recover'
      ? t('Reset your password.', 'Restablece tu contraseña.')
      : session
        ? t('Welcome back.', 'Bienvenido.')
        : t('Sign in to Amparo.', 'Entra en Amparo.');
  return `<button type="button" class="icon-button dialog-close" data-account-action="close" aria-label="${t('Close account', 'Cerrar cuenta')}">×</button>
    <p class="eyebrow">${t('YOUR ACCOUNT', 'TU CUENTA')}</p><h2 id="account-access-title">${heading}</h2>
    <p class="session-note">${t('Your sign-in is saved on this device. Documents, family tools and the assistant remain demo features.', 'Tu sesión se guarda en este dispositivo. Los documentos, las herramientas familiares y el asistente siguen siendo funciones de demostración.')}</p>
    ${
      session && !updating
        ? `<p>${escapeHTML(session.user.email || '')}</p><div class="account-verification"><strong>${membership?.active ? t('Test membership verified', 'Membresía de prueba verificada') : t('No verified membership', 'Sin membresía verificada')}</strong><p>${t('Stripe test mode · No real charge. A checkout return page never activates membership.', 'Modo de prueba de Stripe · Sin cobro real. La página de regreso del pago nunca activa la membresía.')}</p></div>
      <div class="account-access-actions">${button('refresh', t('Check payment status', 'Comprobar pago'), !service.billingEnabled)}${button('checkout', t('Open Stripe test checkout', 'Abrir pago de prueba Stripe'), !service.billingEnabled || membership?.active)}${button('portal', t('Manage billing', 'Administrar pagos'), !service.billingEnabled)}${button('register-passkey', t('Set up Face ID / passkey', 'Configurar Face ID / llave de acceso'), !service.passkeys)}${button('signout', t('Sign out', 'Cerrar sesión'))}${service.deletionEnabled ? button('delete', t('Delete account', 'Eliminar cuenta')) : ''}</div>`
        : accessForm(controller, t, button)
    }
    ${!service?.passkeys ? `<p class="session-note">${t('Passkeys are not enabled for this deployment yet. Face ID will work through a passkey on supported Apple devices; Amparo never receives your face scan.', 'Las llaves de acceso aún no están habilitadas aquí. Face ID funcionará mediante una llave de acceso en dispositivos Apple compatibles; Amparo nunca recibe tu imagen facial.')}</p>` : ''}
    ${!service?.billingEnabled ? `<p class="session-note">${t('Stripe account setup is pending. Checkout is unavailable.', 'La configuración de Stripe está pendiente. El pago no está disponible.')}</p>` : ''}
    ${!service?.signupEnabled && !session ? `<p class="session-note">${service?.googleEnabled ? t(service?.appleEnabled ? 'Create your account with Apple or Google.' : 'New here? Continue with Google to create your account.', '¿Primera visita? Continúa con Google para crear tu cuenta.') : t('New-account registration is not open yet.', 'El registro de cuentas nuevas aún no está abierto.')}</p>` : ''}
    <p class="session-note"><a href="https://philipgraffshapiro.github.io/amparo-demo/privacy.html" target="_blank" rel="noopener">${t('Privacy', 'Privacidad')}</a> · <a href="https://philipgraffshapiro.github.io/amparo-demo/terms.html" target="_blank" rel="noopener">${t('Demo terms', 'Condiciones de la demo')}</a></p>
    <p id="account-access-status" role="status" aria-live="polite">${busy ? t('Working…', 'Procesando…') : notices[status] || ''}</p>`;
}
