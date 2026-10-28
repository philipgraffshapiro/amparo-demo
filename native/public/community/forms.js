import { icon } from '../product-icons.js';
import { escapeHTML } from '../product-data.js';
import { cities, kinds, regions } from './data.js';
import { textFor } from './views.js';
import { reportExtras } from '../family/views.js';

export function reportForm(language, draft = {}) {
  const t = textFor(language);
  return `<div class="dialog-head"><div><p class="eyebrow">${t('COMMUNITY REPORT', 'REPORTE COMUNITARIO')}</p><h2 id="community-dialog-title">${t('Report activity', 'Reportar actividad')}</h2></div><button type="button" class="icon-button" data-community-action="close-dialog" aria-label="${t('Close', 'Cerrar')}">${icon('close')}</button></div>
    <p class="community-form-intro">${t('Demo mode. Your report stays in this browser tab.', 'Modo de ejemplo. Tu reporte se guarda en esta pestaña del navegador.')}</p>
    <form id="community-report-form"><div class="community-form-grid">
      <label>${t('What was reported?', '¿Qué se reportó?')}<select name="kind" required>${Object.entries(
        kinds,
      )
        .map(
          ([key, value]) =>
            `<option value="${key}" ${draft.kind === key ? 'selected' : ''}>${value[language]}</option>`,
        )
        .join('')}</select></label>
      <label>${t('City / approximate area', 'Ciudad / zona aproximada')}<select name="city" required>${Object.entries(
        cities,
      )
        .map(
          ([key, value]) =>
            `<option value="${key}" ${draft.city === key ? 'selected' : ''}>${value.name}</option>`,
        )
        .join('')}</select></label>
      <label>${t('Date observed', 'Fecha de observación')}<input name="date" type="date" min="2026-09-28" max="2026-10-27" value="${escapeHTML(draft.date || '2026-10-27')}" required><small>${t('Demo reference date: Oct 27, 2026', 'Fecha de la demo: 27 oct. 2026')}</small></label>
      <label>${t('People reportedly detained', 'Personas reportadas detenidas')}<input name="people" type="number" min="1" max="99" placeholder="${t('Unknown / not applicable', 'Desconocido / no aplica')}" value="${escapeHTML(draft.people || '')}"><small>${t('Leave blank if not known', 'Déjalo vacío si no se sabe')}</small></label>
    </div><label class="community-description-label">${t('Describe the observation', 'Describe la observación')}<textarea name="description" minlength="12" maxlength="800" rows="4" required placeholder="${t('What happened in the area? Leave out names and personal identifiers.', '¿Qué ocurrió en la zona? Omite nombres y datos personales.')}">${escapeHTML(draft.description || '')}</textarea></label>
      ${reportExtras(language, draft)}<p id="community-form-error" class="form-error" role="alert"></p><div class="community-form-actions"><button class="button quiet" type="button" data-community-action="close-dialog">${t('Cancel', 'Cancelar')}</button><button class="button community-primary" type="submit">${icon('send')}${t('Save sample report', 'Guardar reporte de ejemplo')}</button></div>
    </form>`;
}

export function watchForm(language, following) {
  const t = textFor(language);
  return `<div class="dialog-head"><div><p class="eyebrow">${t('ALERT PREFERENCES', 'PREFERENCIAS DE ALERTAS')}</p><h2 id="community-dialog-title">${t('Areas you follow', 'Zonas que sigues')}</h2></div><button type="button" class="icon-button" data-community-action="close-dialog" aria-label="${t('Close', 'Cerrar')}">${icon('close')}</button></div><p class="community-form-intro">${t('Choose the counties you want to follow.', 'Elige los condados que quieres seguir.')}</p><div class="community-watch-list">${regions.map((region) => `<button type="button" data-community-follow="${region.id}" role="switch" aria-checked="${following.has(region.id)}"><span>${icon('pin')}<strong>${region.name}</strong></span><span class="community-watch-check">${icon(following.has(region.id) ? 'check' : 'plus')}</span></button>`).join('')}</div><div class="community-watch-note">${icon('bell')}<p>${t('Demo only. Notifications are not sent.', 'Solo es una demostración. No se envían notificaciones.')}</p></div><button class="button community-primary full" type="button" data-community-action="preview-alert" ${following.size ? '' : 'disabled'}>${t('Preview an alert', 'Ver una alerta de ejemplo')}${icon('arrow')}</button>`;
}

export function alertPreview(report, language) {
  const t = textFor(language);
  return `<div class="community-notification-art">${icon('bell')}<span>${t('ALERT PREVIEW', 'VISTA PREVIA')}</span></div><h2 id="community-dialog-title">${t('A report in an area you follow.', 'Un reporte en una zona que sigues.')}</h2><p class="community-form-intro">${escapeHTML(report.name)} · ${kinds[report.kind][language]}</p><p>${escapeHTML(report.description[language])}</p><div class="community-preview-status">${t('This is an in-app example. Nothing was sent.', 'Este es un ejemplo dentro de la app. No se envió nada.')}</div><button class="button community-primary full" type="button" data-community-open="${report.id}">${t('View report on map', 'Ver reporte en el mapa')}${icon('arrow')}</button><button class="text-action" type="button" data-community-action="close-dialog">${t('Close preview', 'Cerrar vista previa')}</button>`;
}
