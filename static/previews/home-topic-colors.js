(() => {
  const options = [...document.querySelectorAll('[data-topic-option]')];
  options.forEach(button => button.addEventListener('click', () => {
    document.body.dataset.topicPalette = button.dataset.topicOption;
    options.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
  }));
})();
