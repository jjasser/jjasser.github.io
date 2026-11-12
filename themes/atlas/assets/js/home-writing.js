(() => {
  const section = document.querySelector('.home-gallery-layout');
  if (!section) return;

  const cards = [...section.querySelectorAll('.home-gallery-grid .post-card')];
  const topics = [...section.querySelectorAll('.home-topic')];
  const clear = section.querySelector('.home-topic-clear');
  const status = section.querySelector('.home-topic-status');
  let selected = '';

  function render() {
    const visible = cards.filter(card => {
      const matches = !selected || card.dataset.tags.split(/\s+/).includes(selected);
      card.hidden = !matches;
      card.classList.remove('is-featured');
      return matches;
    });

    visible.slice(0, 2).forEach(card => card.classList.add('is-featured'));
    topics.forEach(topic => topic.setAttribute('aria-pressed', String(topic.dataset.topic === selected)));
    clear.hidden = !selected;

    if (selected) {
      const name = topics.find(topic => topic.dataset.topic === selected)?.querySelector('span')?.textContent || selected;
      status.textContent = `Showing ${visible.length} ${name} ${visible.length === 1 ? 'article' : 'articles'}.`;
    } else {
      status.textContent = `Showing all ${visible.length} ${visible.length === 1 ? 'article' : 'articles'}.`;
    }
  }

  topics.forEach(topic => topic.addEventListener('click', () => {
    selected = selected === topic.dataset.topic ? '' : topic.dataset.topic;
    render();
  }));
  clear.addEventListener('click', () => {
    selected = '';
    render();
  });
  render();
})();
