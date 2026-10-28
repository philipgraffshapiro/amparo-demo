import { loadNews } from './service.js';
import { renderNews } from './views.js';

export class NewsController {
  constructor(app) {
    this.app = app;
    this.options = app.options.news || {};
    this.now = this.options.now || Date.now;
    this.state = { loading: false, error: false };
    this.generation = 0;
    this.visibility = () => this.show(this.app.current);
    this.imageError = (event) => {
      const photo = event.target;
      if (!photo.matches?.('.news-photo img')) return;
      photo.closest('.news-card')?.classList.add('news-card-text-only');
      photo.closest('.news-photo')?.remove();
    };
  }

  mount() {
    this.attached = true;
    this.app.document.addEventListener('visibilitychange', this.visibility);
    this.app.document.addEventListener('error', this.imageError, true);
    this.render();
    this.show(this.app.current);
  }

  render() {
    const language = this.app.store.get().language;
    for (const [selector, compact] of [
      ['#community-news', false],
      ['#home-community-reports', true],
    ]) {
      const host = this.app.document.querySelector(selector);
      if (host)
        host.innerHTML = renderNews(this.state, language, {
          compact,
          now: this.now(),
        });
    }
    for (const el of this.app.document.querySelectorAll('[data-home-reports]'))
      el.textContent = this.state.data?.items.length ?? '—';
  }

  show(route) {
    const visible =
      this.attached &&
      this.app.document.visibilityState !== 'hidden' &&
      (route === 'home' ||
        (route === 'alerts' && this.app.community?.tab === 'news'));
    if (!visible) {
      this.stop();
      return;
    }
    const interval = this.options.pollMs ?? 5 * 60 * 1000;
    if (
      !this.request &&
      (!this.lastAttempt || this.now() - this.lastAttempt >= interval)
    )
      this.ready = this.load();
    if (!this.timer)
      this.timer = this.app.window.setInterval(() => {
        if (!this.request) this.ready = this.load();
      }, interval);
  }

  async load() {
    this.request?.abort();
    const generation = ++this.generation;
    const request = new AbortController();
    this.request = request;
    this.lastAttempt = this.now();
    this.state.loading = true;
    this.render();
    try {
      const result = await loadNews({
        ...this.options,
        fetch:
          this.options.fetch ?? this.app.window.fetch?.bind(this.app.window),
        snapshot: this.options.snapshot ?? this.app.window.AMPARO_NEWS_SNAPSHOT,
        signal: request.signal,
      });
      if (generation !== this.generation) return;
      this.state = { ...result, loading: false };
    } catch {
      if (generation !== this.generation) return;
      this.state = { ...this.state, loading: false, error: true };
    } finally {
      if (generation === this.generation) {
        this.request = null;
        this.render();
      }
    }
  }

  stop() {
    this.app.window.clearInterval(this.timer);
    this.timer = null;
    if (this.request) {
      this.generation++;
      this.request.abort();
      this.request = null;
      this.state.loading = false;
      this.lastAttempt = null;
    }
  }

  detach() {
    this.attached = false;
    this.app.document.removeEventListener('visibilitychange', this.visibility);
    this.app.document.removeEventListener('error', this.imageError, true);
    this.stop();
  }
}
