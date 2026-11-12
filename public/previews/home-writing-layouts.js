(() => {
  const nav = document.querySelector('.site-header nav');
  const tagsLink = document.createElement('a');
  tagsLink.href = '/tags/';
  tagsLink.textContent = 'Tags';
  nav.append(tagsLink);

  const grid = document.querySelector('.writing-section .post-grid');
  const layout = document.createElement('div');
  layout.className = 'writing-preview-layout';
  const rail = document.createElement('aside');
  rail.className = 'writing-tag-rail';
  rail.setAttribute('aria-label', 'Explore writing by tag');
  rail.innerHTML = '<span>EXPLORE THE NOTES</span><h3>Topics</h3><nav aria-label="Post tags"><a href="/tags/ai-security/">AI security <span>5</span></a><a href="/tags/red-teaming/">Red teaming <span>5</span></a><a href="/tags/agent-security/">Agent security <span>2</span></a><a href="/tags/prompt-injection/">Prompt injection <span>1</span></a><a href="/tags/agent-memory/">Agent memory <span>1</span></a><a href="/tags/">All tags ↗</a></nav>';
  grid.parentNode.insertBefore(layout, grid);
  layout.append(rail, grid);

  const modes = ['rail', 'feature', 'index', 'mosaic', 'panels', 'timeline'];
  document.querySelectorAll('[data-writing-mode]').forEach(button => {
    button.addEventListener('click', () => {
      document.body.classList.remove(...modes.map(mode => 'writing-mode-' + mode));
      document.body.classList.add('writing-mode-' + button.dataset.writingMode);
      document.querySelectorAll('[data-writing-mode]').forEach(option => {
        option.setAttribute('aria-pressed', String(option === button));
      });
    });
  });
})();
