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
    card.dataset.date = card.querySelector('time')?.textContent || '';
    card.dataset.open = String(index === 0);
    card.dataset.spotlight = String(index === 0);
    const toggle = document.createElement('button');
    toggle.className = 'accordion-toggle';
    toggle.type = 'button';
    toggle.textContent = index === 0 ? 'Collapse −' : 'Expand +';
    toggle.setAttribute('aria-expanded', String(index === 0));
    toggle.setAttribute('aria-label', `${toggle.textContent} ${card.querySelector('h3').textContent}`);
    toggle.addEventListener('click', () => {
      const open = card.dataset.open !== 'true';
      card.dataset.open = String(open);
      toggle.textContent = open ? 'Collapse −' : 'Expand +';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', `${toggle.textContent} ${card.querySelector('h3').textContent}`);
    });
    card.append(toggle);
  });

  const layout = document.createElement('div');
  layout.className = 'playful-layout';
  const rail = document.createElement('aside');
  rail.className = 'playful-tags';
  rail.setAttribute('aria-label', 'Explore writing by tag');
  rail.innerHTML = '<span>EXPLORE THE NOTES</span><h3>Topics</h3><nav aria-label="Post tags"><a href="/tags/ai-security/">AI security <span>5</span></a><a href="/tags/red-teaming/">Red teaming <span>5</span></a><a href="/tags/agent-security/">Agent security <span>2</span></a><a href="/tags/prompt-injection/">Prompt injection <span>1</span></a><a href="/tags/agent-memory/">Agent memory <span>1</span></a><a href="/tags/">All tags ↗</a></nav>';
  grid.parentNode.insertBefore(layout, grid);
  layout.append(rail, grid);

  let spotlightIndex = 0;
  const spotlightControls = document.createElement('div');
  spotlightControls.className = 'spotlight-controls';
  spotlightControls.innerHTML = '<button type="button" data-step="-1">← Previous</button><span aria-live="polite"></span><button type="button" data-step="1">Next →</button>';
  grid.append(spotlightControls);
  function showSpotlight(index) {
    spotlightIndex = (index + cards.length) % cards.length;
    cards.forEach((card, cardIndex) => {
      card.dataset.spotlight = String(cardIndex === spotlightIndex);
    });
    spotlightControls.querySelector('span').textContent = `${spotlightIndex + 1} / ${cards.length}`;
  }
  spotlightControls.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => showSpotlight(spotlightIndex + Number(button.dataset.step)));
  });
  showSpotlight(0);

  const modes = ['pinned', 'blueprint', 'orbit', 'books', 'tickets', 'index', 'accordion', 'calendar', 'path', 'spotlight'];
  document.querySelectorAll('[data-play-mode]').forEach(button => {
    button.addEventListener('click', () => {
      document.body.classList.remove(...modes.map(mode => 'play-' + mode));
      document.body.classList.add('play-' + button.dataset.playMode);
      document.querySelectorAll('[data-play-mode]').forEach(option => {
        option.setAttribute('aria-pressed', String(option === button));
      });
    });
  });
})();
