/* Loaded only with typography-preview.toml. Production remains JavaScript-free. */
(() => {
  'use strict';
  const presets = {
    subtle: { name: 17, caption: 12, body: 17, code: 14 },
    balanced: { name: 18, caption: 13, body: 18, code: 15 },
    generous: { name: 20, caption: 14, body: 19, code: 16 }
  };
  const tones = { slate: '#43524c', charcoal: '#36443d', ink: '#29382f' };
  const key = 'atlas-typography-preview-v1';
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(key)) || {}; } catch (_) { /* Private browsing may disable storage. */ }
  const query = new URL(location.href).searchParams;
  let size = query.get('typeSize') || stored.size;
  let tone = query.get('typeTone') || stored.tone;
  if (!Object.hasOwn(presets, size)) size = 'balanced';
  if (!Object.hasOwn(tones, tone)) tone = 'ink';
  function apply() {
    document.documentElement.dataset.typeSize = size;
    document.documentElement.dataset.typeTone = tone;
    try { localStorage.setItem(key, JSON.stringify({ size, tone })); } catch (_) { /* URL parameters still preserve the selection. */ }
  }
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    const panel = document.querySelector('.type-preview');
    if (!panel) return;
    function update() {
      apply();
      panel.querySelectorAll('[data-size]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.size === size)));
      panel.querySelectorAll('[data-tone]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tone === tone)));
      const p = presets[size];
      panel.querySelector('#type-preview-readout').textContent = `Name ${p.name}px · Caption ${p.caption}px · Body ${p.body}px · Code ${p.code}px · ${tones[tone]}`;
      // Carry the exact combination through real links, even if storage is unavailable.
      document.querySelectorAll('a[href]').forEach(a => {
        const raw = a.getAttribute('href');
        if (raw.startsWith('#')) return;
        const url = new URL(raw, location.href);
        if (url.origin !== location.origin || /\.[a-z0-9]+$/i.test(url.pathname)) return;
        url.searchParams.set('typeSize', size);
        url.searchParams.set('typeTone', tone);
        a.setAttribute('href', url.pathname + url.search + url.hash);
      });
      const url = new URL(location.href);
      url.searchParams.set('typeSize', size);
      url.searchParams.set('typeTone', tone);
      history.replaceState(null, '', url);
    }
    panel.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => { size = b.dataset.size; update(); }));
    panel.querySelectorAll('[data-tone]').forEach(b => b.addEventListener('click', () => { tone = b.dataset.tone; update(); }));
    panel.querySelector('.type-preview-reset').addEventListener('click', () => { size = 'balanced'; tone = 'ink'; update(); });
    update();
  });
})();
