import { escapeHTML } from '../product-data.js';
import { icon } from '../product-icons.js';
import { textFor } from '../community/views.js';
import { familyStages } from './service.js';

export function photoGallery(photos, language, removable = false) {
  const t = textFor(language);
  return photos
    .map(
      (photo, i) =>
        `<figure class="report-photo"><img src="${escapeHTML(photo.url)}" alt="${escapeHTML(photo.name)}"><figcaption>${escapeHTML(photo.name)}</figcaption>${removable ? `<button type="button" class="icon-button" data-family-action="remove-photo" data-photo-index="${i}" aria-label="${t('Remove photo', 'Quitar foto')} ${i + 1}">${icon('close')}</button>` : ''}</figure>`,
    )
    .join('');
}

export function privateEvidence(photos, language) {
  if (!photos.length) return '';
  const t = textFor(language);
  return `<section class="family-private-gallery"><h3>${t('Your private evidence', 'Tu evidencia privada')}</h3><p>${t('Only visible to you in this demo. These photos are not published with the report.', 'Solo tú puedes ver estas fotos en la demo. No se publican con el reporte.')}</p><div class="report-photo-grid">${photoGallery(photos, language)}</div></section>`;
}

export function reportExtras(language, draft) {
  const t = textFor(language);
  return `<div class="report-private-fields"><label>${t('How are you connected?', '¿Cómo te relacionas?')}<select name="reporterRelation">${[
    ['witness', 'I witnessed this', 'Fui testigo'],
    ['family', 'I am reporting for family', 'Reporto por mi familia'],
    ['community', 'Community / partner report', 'Reporte comunitario'],
  ]
    .map(
      ([id, en, es]) =>
        `<option value="${id}" ${draft.reporterRelation === id ? 'selected' : ''}>${t(en, es)}</option>`,
    )
    .join(
      '',
    )}</select></label><label class="report-family-toggle"><input type="checkbox" name="trackFamily" ${draft.trackFamily ? 'checked' : ''}><span>${t('Add a private family follow-up', 'Añadir seguimiento familiar privado')}</span></label><div class="report-photo-heading"><strong>${t('Photos & evidence', 'Fotos y evidencia')}</strong><span>${icon('lock')}${t('Private', 'Privado')}</span></div><p class="report-photo-note">${t('Visible only to you in this demo. Photos are kept off the public map. A live upload will go to private storage for review.', 'Solo tú puedes verlas en esta demo. Las fotos no aparecen en el mapa público. En el servicio real irán al almacenamiento privado para revisión.')}</p><label class="report-photo-picker">${icon('upload')}<span>${t('Choose photos', 'Elegir fotos')}<small>JPG, PNG, WebP · 3 × 5 MB</small></span><input id="report-photos" type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="${t('Add private photos', 'Añadir fotos privadas')}"></label><div id="report-photo-draft" class="report-photo-grid"></div><p id="report-photo-error" class="form-error" role="alert"></p></div>`;
}

function eventTime(value, language) {
  return new Intl.DateTimeFormat(language, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function familySpace(item, cases, photos, language, draft = {}) {
  const t = textFor(language);
  const column = language === 'es' ? 1 : 0;
  const stage = familyStages[item.stage][column];
  return `<div class="family-space-heading"><div><p class="eyebrow">${icon('lock')}${t('PRIVATE FAMILY SPACE', 'ESPACIO FAMILIAR PRIVADO')}</p><h2>${t('Stay close. Stay informed.', 'Cerca de ti. Al tanto.')}</h2><p>${t('A shared picture of what is known, and what happens next.', 'Lo que se sabe y el siguiente paso, en un mismo lugar.')}</p></div><span class="sample-label">${t('INTERACTIVE DEMO', 'DEMO INTERACTIVA')}</span></div><div class="family-case-tabs" role="group" aria-label="${t('Family follow-ups', 'Seguimientos familiares')}">${cases.map((entry) => `<button type="button" data-family-case="${escapeHTML(entry.id)}" aria-pressed="${entry.id === item.id}">${icon('people')}${escapeHTML(entry.name)}</button>`).join('')}</div><div class="family-workspace"><div class="family-case-panel"><div class="family-case-top"><span>${escapeHTML(item.area)}</span><span class="family-stage-pill">${stage}</span></div><h3>${t('Every update, in one place.', 'Cada novedad, en un lugar.')}</h3><ol class="family-timeline">${item.events.map((event) => `<li><i>${icon('check')}</i><div><strong>${familyStages[event.stage][column]}</strong><time datetime="${event.at}">${eventTime(event.at, language)}</time><p>${escapeHTML(event.note)}</p></div></li>`).join('')}</ol><div class="family-next-check">${icon('clock')}<div><strong>${t('Next family check-in', 'Próximo contacto familiar')}</strong><span>${item.nextCheckAt ? eventTime(item.nextCheckAt, language) : t('No check-in scheduled', 'Sin contacto programado')}</span></div></div>${item.reportId ? `<button type="button" class="text-action" data-community-open="${escapeHTML(item.reportId)}">${t('View the community report', 'Ver reporte comunitario')}${icon('arrow')}</button>` : ''}<div class="family-private-gallery"><div class="section-line"><h4>${t('Private evidence', 'Evidencia privada')}</h4><span>${photos.length} ${t('photos', 'fotos')}</span></div><div class="report-photo-grid">${photos.length ? photoGallery(photos, language) : `<p class="subtle">${t('Photos attached to your report appear here. They are not published to the map.', 'Las fotos de tu reporte aparecen aquí. No se publican en el mapa.')}</p>`}</div></div></div><aside class="family-update-panel"><p class="eyebrow">${t('KEEP YOUR PEOPLE CLOSE', 'CERCA DE TU GENTE')}</p><h3>${t('Share the next update.', 'Comparte la novedad.')}</h3><p>${t('Record what your family has confirmed. Updating this space does not verify a public report.', 'Registra lo que tu familia confirmó. Esto no verifica el reporte público.')}</p><form id="family-update-form"><label>${t('Current status', 'Estado actual')}<select name="familyStage">${Object.entries(
    familyStages,
  )
    .map(
      ([key, labels]) =>
        `<option value="${key}" ${key === (draft.familyStage || item.stage) ? 'selected' : ''}>${labels[column]}</option>`,
    )
    .join(
      '',
    )}</select></label><label>${t('What has changed?', '¿Qué ha cambiado?')}<textarea name="familyNote" minlength="8" maxlength="800" rows="4" required placeholder="${t('Add a private update for your circle…', 'Añade una novedad privada…')}">${escapeHTML(draft.familyNote || '')}</textarea></label><label>${t('Check in again', 'Volver a contactar')}<select name="checkInHours">${[
    [1, 'In 1 hour', 'En 1 hora'],
    [4, 'In 4 hours', 'En 4 horas'],
    [24, 'Tomorrow', 'Mañana'],
    [168, 'In one week', 'En una semana'],
  ]
    .map(
      ([hours, en, es]) =>
        `<option value="${hours}" ${String(hours) === String(draft.checkInHours || 1) ? 'selected' : ''}>${t(en, es)}</option>`,
    )
    .join(
      '',
    )}</select></label><p id="family-error" class="form-error" role="alert"></p><button type="submit" class="button primary full">${t('Save private update', 'Guardar novedad privada')}${icon('arrow')}</button></form><p class="family-demo-note">${t('Demo: stays in this tab. No message is sent. Refreshing clears your sample updates and photos.', 'Demo: permanece en esta pestaña. No se envían mensajes. Recargar borra novedades y fotos de ejemplo.')}</p><button type="button" class="text-action" data-family-action="preview">${icon('bell')}${t('Preview the family notification', 'Ver notificación familiar')}</button></aside></div>`;
}

export function familyNotification(item, language) {
  const t = textFor(language);
  return `<button type="button" class="icon-button dialog-close" data-community-action="close-dialog" aria-label="${t('Close preview', 'Cerrar vista previa')}">${icon('close')}</button><div class="family-notification"><span class="family-notification-brand">${icon('shield')} amparo <small>${t('now · preview', 'ahora · ejemplo')}</small></span><strong>${t('Your family space has an update.', 'Hay novedades en tu espacio familiar.')}</strong><p>${t('Open Amparo to view it privately.', 'Abre Amparo para verlo en privado.')}</p><small>${t('Names, locations and photos stay off the lock screen.', 'Nombres, ubicaciones y fotos no aparecen en la pantalla bloqueada.')}</small></div><div class="family-delivery-preview"><span>${icon('check')}${t('Saved in this demo', 'Guardado en esta demo')}</span><span>${icon('bell')}${t('Push / SMS not sent', 'Push / SMS no enviados')}</span></div><h2 id="community-dialog-title">${t('A quiet, private update.', 'Una novedad privada.')}</h2><p>${t('Your circle opens the app to see the full update. This preview does not notify anyone.', 'Tu círculo abre la app para ver la novedad. Esta vista previa no avisa a nadie.')}</p><button class="button primary full" type="button" data-family-case="${escapeHTML(item.id)}">${t('Open family space', 'Abrir espacio familiar')}${icon('arrow')}</button>`;
}
