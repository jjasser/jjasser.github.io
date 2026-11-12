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
    const toggle = document.createElement('button');
    toggle.className = 'accordion-toggle';
    toggle.type = 'button';
    const setOpen = open => {
      card.dataset.open = String(open);
      toggle.textContent = open ? 'Collapse −' : 'Expand +';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', `${toggle.textContent} ${card.querySelector('h3').textContent}`);
    };
    setOpen(index === 0);
    toggle.addEventListener('click', () => setOpen(card.dataset.open !== 'true'));
    card.append(toggle);
  });

  const layout = document.createElement('div');
  layout.className = 'review-layout';
  const rail = document.createElement('aside');
  rail.className = 'review-tags';
  rail.setAttribute('aria-label', 'Explore writing by tag');
  rail.innerHTML = '<span>EXPLORE THE NOTES</span><h3>Topics</h3><nav aria-label="Post tags"><a href="/tags/ai-security/">AI security <span>5</span></a><a href="/tags/red-teaming/">Red teaming <span>5</span></a><a href="/tags/agent-security/">Agent security <span>2</span></a><a href="/tags/prompt-injection/">Prompt injection <span>1</span></a><a href="/tags/agent-memory/">Agent memory <span>1</span></a><a href="/tags/">All tags ↗</a></nav>';
  grid.parentNode.insertBefore(layout, grid);
  layout.append(rail, grid);

  const modes = ['tickets','index','accordion','editorial','margins','gallery','ledger','stack','feature','diagonal','timeline','chapters','library'];
  document.querySelectorAll('[data-review-mode]').forEach(button => {
    button.addEventListener('click', () => {
      document.body.classList.remove(...modes.map(mode => 'review-' + mode));
      document.body.classList.add('review-' + button.dataset.reviewMode);
      document.querySelectorAll('[data-review-mode]').forEach(option => {
        option.setAttribute('aria-pressed', String(option === button));
      });
    });
  });
})();
