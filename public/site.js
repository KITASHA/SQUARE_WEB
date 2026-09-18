// Preserve the existing Bootstrap collapse markup without Rails/Turbo or jQuery.
const toggler = document.querySelector('[data-bs-target="#navbarHeader"]');
const menu = document.getElementById('navbarHeader');
let transitioning = false;
if (toggler && menu) {
  toggler.addEventListener('click', () => {
    if (transitioning) return;
    transitioning = true;
    const open = menu.classList.contains('show');
    toggler.setAttribute('aria-expanded', String(!open));
    if (open) {
      menu.style.height = `${menu.getBoundingClientRect().height}px`;
      void menu.offsetHeight;
      menu.classList.add('collapsing');
      menu.classList.remove('collapse', 'show');
      menu.style.height = '';
    } else {
      menu.classList.remove('collapse');
      menu.classList.add('collapsing');
      menu.style.height = '0px';
      void menu.offsetHeight;
      menu.style.height = `${menu.scrollHeight}px`;
    }
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350;
    setTimeout(() => {
      menu.classList.remove('collapsing');
      menu.classList.add('collapse');
      menu.classList.toggle('show', !open);
      menu.style.height = '';
      transitioning = false;
    }, duration);
  });
}
const myBtn = document.getElementById('myBtn');
if (myBtn) {
  myBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => {
    myBtn.style.display = document.body.scrollTop > 100 || document.documentElement.scrollTop > 100 ? 'block' : 'none';
  }, { passive: true });
}
