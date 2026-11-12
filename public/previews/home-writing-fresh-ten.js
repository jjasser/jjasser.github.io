(() => {
  const nav = document.querySelector('.site-header nav');
  const tagsLink = document.createElement('a');
  tagsLink.href = '/tags/';
  tagsLink.textContent = 'Tags';
  nav.append(tagsLink);

  const grid = document.querySelector('.writing-section .post-grid');
  const cards = [...grid.querySelectorAll('.post-card')];
  cards.forEach((card, index) => {
    card.dataset.index = String(index + 1).padStart(2, '0');
  });
  const layout = document.createElement('div');
  layout.className = 'fresh-ten-layout';
  const rail = document.createElement('aside');
  rail.className = 'fresh-ten-rail';
  rail.setAttribute('aria-label', 'Explore writing by tag');
  rail.innerHTML = '<span>EXPLORE THE NOTES</span><h3>Topics</h3><nav aria-label="Post tags"><a href="/tags/ai-security/">AI security <span>5</span></a><a href="/tags/red-teaming/">Red teaming <span>5</span></a><a href="/tags/agent-security/">Agent security <span>2</span></a><a href="/tags/prompt-injection/">Prompt injection <span>1</span></a><a href="/tags/agent-memory/">Agent memory <span>1</span></a><a href="/tags/">All tags ↗</a></nav>';
  grid.parentNode.insertBefore(layout, grid);
  layout.append(rail, grid);

  const shelfA = document.createElement('div');
  shelfA.className = 'shelf-heading';
  shelfA.textContent = '01 / AGENT SECURITY';
  grid.insertBefore(shelfA, cards[0]);
  const shelfB = document.createElement('div');
  shelfB.className = 'shelf-heading';
  shelfB.textContent = '02 / FOUNDATIONS & PROMPT INJECTION';
  grid.insertBefore(shelfB, cards[2]);

  const modes = ['cover', 'notebook', 'gallery', 'bands', 'terminal', 'bento', 'filmstrip', 'newspaper', 'dossiers', 'shelves'];
  document.querySelectorAll('[data-next-mode]').forEach(button => {
    button.addEventListener('click', () => {
      document.body.classList.remove(...modes.map(mode => 'next-' + mode));
      document.body.classList.add('next-' + button.dataset.nextMode);
      document.querySelectorAll('[data-next-mode]').forEach(option => {
        option.setAttribute('aria-pressed', String(option === button));
      });
    });
  });
})();
