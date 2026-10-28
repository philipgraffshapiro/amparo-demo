import { createCommunityService } from './service.js';
import { defaultFilters, queryReports } from './model.js';
import { regions } from './data.js';
import {
  reportCard,
  reportDetail,
  reportsTable,
  emptyReports,
} from './views.js';
import { renderCommunityStats } from './stats.js';
import { reportForm, watchForm, alertPreview } from './forms.js';
import { CommunityMaps } from './map.js';
import { NewsController } from '../news/controller.js';

export class CommunityController {
  constructor(app) {
    this.app = app;
    this.api = app.services.community || createCommunityService();
    this.filters = defaultFilters();
    this.tab = 'news';
    this.news = new NewsController(app);
    this.following = new Set();
    this.generation = 0;
    this.submissionGeneration = 0;
    this.lifecycle = 0;
    this.draft = {};
  }

  get document() {
    return this.app.document;
  }
  get language() {
    return this.app.store.get().language;
  }
  text(en, es) {
    return this.app.text(en, es);
  }

  mount() {
    this.news.mount();
    this.maps = new CommunityMaps(
      this.app.window,
      (id) => this.select(id),
      this.app.options.maps !== false,
    );
    this.document
      .querySelector('#community-dialog')
      .addEventListener('cancel', (event) => {
        event.preventDefault();
        this.closeDialog();
      });
    this.restoreFilters();
    if (this.data) this.render();
    else this.ready = this.load();
    if (this.reopen === 'report')
      this.openDialog('report', reportForm(this.language, this.draft));
    else if (this.reopen === 'watch')
      this.openDialog('watch', watchForm(this.language, this.following));
    this.reopen = null;
  }

  detach() {
    this.news.detach();
    const form = this.document.querySelector('#community-report-form');
    if (form)
      this.draft = Object.fromEntries(new this.app.window.FormData(form));
    this.reopen = this.document.querySelector('#community-dialog')?.open
      ? this.dialogMode
      : null;
    this.maps?.destroy();
  }

  async load() {
    const generation = ++this.generation;
    this.loading = true;
    this.error = '';
    this.renderStatus();
    try {
      const data = await this.api.list({ range: '30d' });
      if (generation !== this.generation) return;
      if (
        data.version !== 1 ||
        data.mode !== 'demo' ||
        !Array.isArray(data.reports)
      )
        throw new Error('Unsupported community report response.');
      this.data = data;
    } catch (error) {
      if (generation !== this.generation) return;
      this.error = error.message;
    }
    this.loading = false;
    this.render();
    this.show(this.app.current);
  }

  renderStatus() {
    const box = this.document.querySelector('#community-load-state');
    if (!box) return;
    box.replaceChildren();
    box.hidden = this.tab === 'news' || (!this.loading && !this.error);
    if (this.loading)
      box.textContent = this.text(
        'Loading community reports…',
        'Cargando reportes comunitarios…',
      );
    if (this.error) {
      box.textContent = this.text(
        'Reports could not load. Your filters are preserved. ',
        'No se pudieron cargar los reportes. Tus filtros se conservaron. ',
      );
      const retry = this.document.createElement('button');
      retry.type = 'button';
      retry.dataset.communityAction = 'retry';
      retry.textContent = this.text('Try again', 'Intentar de nuevo');
      box.append(retry);
    }
  }

  filtered() {
    return queryReports(
      this.data?.reports || [],
      this.filters,
      this.data?.snapshotAt,
    );
  }

  render() {
    if (!this.document.querySelector('#community-list')) return;
    this.renderStatus();
    const data = this.filtered();
    this.document.querySelector('#community-list').innerHTML = data.reports
      .length
      ? data.reports
          .map((report) =>
            reportCard(report, this.language, report.id === this.selectedId),
          )
          .join('')
      : emptyReports(this.language);
    this.document.querySelector('#community-report-table').innerHTML =
      reportsTable(data.reports, this.language);
    this.document.querySelector('#community-stats').innerHTML =
      renderCommunityStats(data, this.language);
    this.document.querySelector('[data-community-stat="reports"]').textContent =
      data.stats.reports;
    this.document.querySelector('#community-results-summary').textContent =
      `${data.stats.reports} ${this.text('sample reports', 'reportes de ejemplo')}`;
    this.document.querySelector('#community-table-count').textContent =
      `${data.stats.reports} ${this.text('reports', 'reportes')}`;
    this.document.querySelector('#community-watch-count').textContent =
      this.following.size;
    this.document
      .querySelectorAll('[data-bar-height]')
      .forEach((bar) =>
        bar.style.setProperty('--bar-height', bar.dataset.barHeight + '%'),
      );
    this.document
      .querySelectorAll('[data-bar-width]')
      .forEach((bar) =>
        bar.style.setProperty('--bar-width', bar.dataset.barWidth + '%'),
      );
    this.renderHome();
    this.setTab(this.tab, false);
    this.maps?.update(data.reports);
    const selected = data.reports.find(
      (report) => report.id === this.selectedId,
    );
    const detail = this.document.querySelector('#community-detail');
    detail.hidden = !selected;
    if (selected)
      detail.innerHTML =
        reportDetail(
          selected,
          this.language,
          this.following.has(selected.region),
        ) + (this.app.family?.evidence(selected.id) || '');
  }

  renderHome() {
    this.news.render();
    this.maps?.update(this.filtered().reports, true);
    return;
  }

  restoreFilters() {
    for (const [key, value] of Object.entries(this.filters)) {
      const input = this.document.querySelector('#community-' + key);
      if (input) input.value = value;
    }
  }

  input(target) {
    const key = target.id?.replace('community-', '');
    if (!Object.hasOwn(this.filters, key)) return;
    this.filters[key] = target.value;
    this.selectedId = null;
    this.render();
    this.maps.fit();
  }

  setTab(tab, showMap = true) {
    if (!['news', 'map', 'reports', 'stats'].includes(tab)) return;
    this.tab = tab;
    this.document.querySelector('.community-beta').textContent =
      tab === 'news' ? this.text('NEWS', 'NOTICIAS') : 'DEMO';
    for (const element of this.document.querySelectorAll(
      '.community-filters, .community-export, .community-dataset-note',
    ))
      element.hidden = tab === 'news';
    this.renderStatus();
    this.news.show(this.app.current);
    this.document
      .querySelectorAll('[data-community-panel]')
      .forEach((panel) => {
        panel.hidden = panel.dataset.communityPanel !== tab;
      });
    this.document
      .querySelectorAll('[data-community-tab]')
      .forEach((button) =>
        button.setAttribute(
          'aria-pressed',
          String(button.dataset.communityTab === tab),
        ),
      );
    if (showMap && tab === 'map' && this.app.current === 'alerts')
      this.show('alerts');
  }

  show(route) {
    this.news.show(route);
    if (!this.data) return;
    if (route === 'alerts' && this.tab === 'map')
      this.maps.show(this.filtered().reports);
    if (route === 'home')
      this.maps.show(
        queryReports(this.data.reports, { range: '7d' }, this.data.snapshotAt)
          .reports,
        true,
      );
  }

  select(id) {
    const report = this.data?.reports.find((item) => item.id === id);
    if (!report) return;
    if (!this.filtered().reports.some((item) => item.id === id)) {
      this.filters = defaultFilters();
      this.filters.range = '30d';
      this.restoreFilters();
    }
    this.selectedId = id;
    this.tab = 'map';
    this.app.navigate('alerts', { focus: false });
    this.render();
    this.maps.select(report);
    this.document
      .querySelector('#community-detail h2')
      ?.focus({ preventScroll: true });
  }

  openDialog(mode, html) {
    const dialog = this.document.querySelector('#community-dialog');
    if (!dialog.open) this.opener = this.document.activeElement;
    this.dialogMode = mode;
    this.document.querySelector('#community-dialog-content').innerHTML = html;
    if (!dialog.open) {
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    dialog.querySelector('select, input, button')?.focus();
    this.app.family?.renderDraftPhotos();
  }

  closeDialog() {
    const form = this.document.querySelector('#community-report-form');
    if (form)
      this.draft = Object.fromEntries(new this.app.window.FormData(form));
    const dialog = this.document.querySelector('#community-dialog');
    if (dialog.close) dialog.close();
    else dialog.removeAttribute('open');
    this.submissionGeneration++;
    this.opener?.isConnected && this.opener.focus();
  }

  follow(region) {
    if (!regions.some((item) => item.id === region)) return;
    if (this.following.has(region)) this.following.delete(region);
    else this.following.add(region);
    this.render();
    this.openDialog('watch', watchForm(this.language, this.following));
  }

  async submit(form) {
    if (this.sending || this.app.family?.pending || !form.reportValidity())
      return;
    const generation = ++this.submissionGeneration;
    const lifecycle = this.lifecycle;
    this.sending = true;
    this.draft = Object.fromEntries(new this.app.window.FormData(form));
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      this.requestId ||= Array.from(
        this.app.window.crypto.getRandomValues(new Uint32Array(4)),
        (value) => value.toString(16).padStart(8, '0'),
      ).join('-');
      const report = await this.api.submit({
        ...this.draft,
        idempotencyKey: this.requestId,
      });
      if (lifecycle !== this.lifecycle) return;
      this.app.family?.receive(report, this.draft);
      this.draft = {};
      this.requestId = null;
      await this.load();
      if (generation !== this.submissionGeneration) return;
      this.closeDialog();
      this.draft = {};
      this.select(report.id);
      this.app.toast(
        this.text(
          'Sample report saved as unconfirmed.',
          'Reporte de ejemplo guardado sin confirmar.',
        ),
      );
    } catch {
      if (
        lifecycle === this.lifecycle &&
        generation === this.submissionGeneration
      )
        this.document.querySelector('#community-form-error').textContent =
          this.text(
            'The report could not be saved. Check the fields and try again.',
            'No se pudo guardar. Revisa los campos e intenta de nuevo.',
          );
    } finally {
      if (lifecycle === this.lifecycle) {
        this.sending = false;
        if (button.isConnected) button.disabled = false;
      }
    }
  }

  async action(action) {
    if (action === 'news-retry') return (this.news.ready = this.news.load());
    if (action === 'report')
      this.openDialog('report', reportForm(this.language, this.draft));
    if (action === 'watch')
      this.openDialog('watch', watchForm(this.language, this.following));
    if (action === 'close-dialog') this.closeDialog();
    if (action === 'close-detail') {
      this.selectedId = null;
      this.render();
    }
    if (action === 'clear') {
      this.filters = defaultFilters();
      this.selectedId = null;
      this.restoreFilters();
      this.render();
      this.maps.fit();
    }
    if (action === 'retry') await this.load();
    if (action === 'fit') this.maps.fit();
    if (action === 'export')
      this.app.dialogs.download(
        await this.api.export(this.filters),
        'amparo-community-demo.csv',
        'text/csv;charset=utf-8',
      );
    if (action === 'markers' || action === 'zones') {
      this.maps.setLayer(action);
      this.document
        .querySelectorAll('.community-map-layers button')
        .forEach((button) => {
          button.classList.toggle(
            'selected',
            button.dataset.communityAction === action,
          );
          button.setAttribute(
            'aria-pressed',
            String(button.dataset.communityAction === action),
          );
        });
    }
    if (action === 'street')
      this.document
        .querySelector('[data-community-action="street"]')
        .setAttribute('aria-pressed', String(this.maps.toggleStreet()));
    if (action === 'preview-alert') {
      const report = this.data?.reports.find((item) =>
        this.following.has(item.region),
      );
      if (report)
        this.openDialog('preview', alertPreview(report, this.language));
    }
  }

  reset() {
    this.closeDialog();
    this.lifecycle++;
    this.generation++;
    this.sending = false;
    this.requestId = null;
    this.api.reset?.();
    this.data = null;
    this.filters = defaultFilters();
    this.following.clear();
    this.selectedId = null;
    this.draft = {};
    this.reopen = null;
    this.tab = 'map';
  }
  destroy() {
    this.news.detach();
    this.lifecycle++;
    this.generation++;
    this.submissionGeneration++;
    this.maps?.destroy();
  }
}
