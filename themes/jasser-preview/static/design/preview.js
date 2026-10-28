(() => {
  const active = document.documentElement.dataset.design;
  try { sessionStorage.setItem('jasser-design', active); } catch {}
  const names = { atlas: 'Atlas — editorial journal', cipher: 'Cipher — security lab', folio: 'Folio — personal portfolio', fieldnotes: 'Fieldnotes — technical notebook', signal: 'Signal — independent magazine' };
  document.title = `${names[active]} | ${document.title}`;
  document.querySelectorAll('.design-dock a').forEach(link => {
    const url = new URL(location.href);
    url.searchParams.set('design', link.dataset.design);
    link.href = url.pathname + url.search + url.hash;
    if (link.dataset.design === active) link.setAttribute('aria-current', 'true');
  });
  document.querySelectorAll('a[href]').forEach(link => {
    if (link.closest('.design-dock') || link.getAttribute('href').startsWith('#')) return;
    const url = new URL(link.href, location.href);
    if (url.origin === location.origin) {
      url.searchParams.set('design', active);
      link.href = url.pathname + url.search + url.hash;
    }
  });
})();
