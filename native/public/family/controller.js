import { createFamilyService } from './service.js';
import { PrivateReportMedia } from './media.js';
import {
  familySpace,
  familyNotification,
  photoGallery,
  privateEvidence,
} from './views.js';

export class FamilyController {
  constructor(app) {
    this.app = app;
    this.service = app.services.family || createFamilyService();
    this.media = new PrivateReportMedia(app.window);
    this.selected = this.service.list()[0].id;
    this.draft = {};
  }

  captureDraft() {
    const form = this.app.document.querySelector('#family-update-form');
    if (form)
      this.draft = Object.fromEntries(new this.app.window.FormData(form));
  }

  render(capture = true) {
    if (capture) this.captureDraft();
    const host = this.app.document.querySelector('#family-progress');
    if (!host) return;
    const cases = this.service.list();
    const item = this.service.get(this.selected) || cases[0];
    host.innerHTML = familySpace(
      item,
      cases,
      this.media.forReport(item.reportId),
      this.app.store.get().language,
      this.draft,
    );
  }

  select(id) {
    if (!this.service.get(id)) return;
    this.selected = id;
    this.draft = {};
    this.app.community?.closeDialog();
    this.app.navigate('circle');
    this.render(false);
  }

  receive(report, draft) {
    this.media.commit(report.id);
    if (draft.trackFamily) {
      this.selected = this.service.fromReport(report).id;
      this.draft = {};
      this.render(false);
    }
  }

  evidence(reportId) {
    return privateEvidence(
      this.media.forReport(reportId),
      this.app.store.get().language,
    );
  }

  submit(form) {
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new this.app.window.FormData(form));
    try {
      this.service.update(this.selected, {
        stage: values.familyStage,
        note: values.familyNote,
        checkInHours: values.checkInHours,
      });
      this.draft = {};
      this.render(false);
      this.app.toast(
        this.app.text(
          'Private sample update saved.',
          'Novedad privada de ejemplo guardada.',
        ),
      );
    } catch (error) {
      this.app.document.querySelector('#family-error').textContent =
        error.message;
    }
  }

  async addPhotos(input) {
    if (this.pending) return;
    this.pending = true;
    const submit = input.form?.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    const generation = this.media.generation;
    try {
      await this.media.add(input.files);
      this.photoError = '';
    } catch (error) {
      this.photoError = error.message;
    } finally {
      this.pending = false;
      if (generation === this.media.generation) {
        input.value = '';
        if (submit?.isConnected) submit.disabled = false;
        this.renderDraftPhotos();
      }
    }
  }

  renderDraftPhotos() {
    const host = this.app.document.querySelector('#report-photo-draft');
    if (host)
      host.innerHTML = photoGallery(
        this.media.draft,
        this.app.store.get().language,
        true,
      );
    const error = this.app.document.querySelector('#report-photo-error');
    if (error) error.textContent = this.photoError || '';
  }

  action(action, button) {
    if (action === 'remove-photo') {
      this.media.remove(Number(button.dataset.photoIndex));
      this.renderDraftPhotos();
    }
    if (action === 'preview')
      this.app.community?.openDialog(
        'family-preview',
        familyNotification(
          this.service.get(this.selected),
          this.app.store.get().language,
        ),
      );
  }

  reset() {
    this.media.reset();
    this.service.reset();
    this.selected = this.service.list()[0].id;
    this.draft = {};
    this.photoError = '';
  }

  destroy() {
    this.media.reset();
  }
}
