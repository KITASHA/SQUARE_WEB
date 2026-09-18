const socialIcons = {
  x: `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill-icon" d="M18.9 2H22l-6.77 7.73L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.26-8.3L2.98 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.84h1.73L8.44 4.05H6.58L17.8 19.84Z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.7"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.35" cy="6.75" r="1" class="fill-icon"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8.1a3 3 0 0 0-2.1-2.1C17.1 5.5 12 5.5 12 5.5s-5.1 0-6.9.5A3 3 0 0 0 3 8.1 31 31 0 0 0 2.5 12 31 31 0 0 0 3 15.9 3 3 0 0 0 5.1 18c1.8.5 6.9.5 6.9.5s5.1 0 6.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-3.9 31 31 0 0 0-.5-3.9Z"/><path class="fill-icon" d="m10 15.2 5.2-3.2L10 8.8v6.4Z"/></svg>`
};

function headerMarkup() {
  return `
    <header class="sq-header">
      <div class="sq-header-inner">
        <a class="sq-brand" href="/" aria-label="SQUARE ホーム">
          <span class="sq-brand-mark" aria-hidden="true"></span>
          <span class="sq-brand-name">SQUARE</span>
        </a>
        <button class="sq-menu-toggle" type="button" aria-label="メニューを開く" aria-expanded="false" aria-controls="siteMenu">
          <span></span><span></span><span></span>
        </button>
        <nav class="sq-nav" id="siteMenu" aria-label="メインナビゲーション">
          <a href="/homes/about">SQUAREについて</a>
          <a href="/homes/show_1">定期活動会</a>
          <a href="/homes/join">入会について</a>
          <span class="sq-nav-divider" aria-hidden="true"></span>
          <span class="sq-nav-social">
            <a class="sq-nav-icon" href="https://twitter.com/square_okayama" target="_blank" rel="noopener noreferrer" aria-label="X">${socialIcons.x}</a>
            <a class="sq-nav-icon" href="https://www.instagram.com/square_okayama/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">${socialIcons.instagram}</a>
          </span>
        </nav>
      </div>
    </header>`;
}

function footerMarkup() {
  return `
    <footer class="sq-footer">
      <div class="sq-footer-inner">
        <a class="sq-footer-brand" href="/" aria-label="SQUARE ホーム">
          <span class="sq-brand-mark" aria-hidden="true"></span>
          <span><strong>SQUARE</strong><small>Okayama A Cappella Circle</small></span>
        </a>
        <p class="sq-footer-copy">歌でつながる、岡山のアカペラサークル。</p>
        <div class="sq-footer-social">
          <a href="https://twitter.com/square_okayama" target="_blank" rel="noopener noreferrer" aria-label="X">${socialIcons.x}</a>
          <a href="https://www.instagram.com/square_okayama/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">${socialIcons.instagram}</a>
          <a href="https://www.youtube.com/channel/UCpcjVaT57zyOhB92BROiTBA" target="_blank" rel="noopener noreferrer" aria-label="YouTube">${socialIcons.youtube}</a>
        </div>
      </div>
    </footer>`;
}

document.querySelectorAll('[data-site-header]').forEach((slot) => { slot.innerHTML = headerMarkup(); });
document.querySelectorAll('[data-site-footer]').forEach((slot) => { slot.innerHTML = footerMarkup(); });

const currentPath = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
document.querySelectorAll('.sq-nav > a[href^="/"]').forEach((link) => {
  const linkPath = new URL(link.href, window.location.origin).pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  if (linkPath === currentPath) link.setAttribute('aria-current', 'page');
});

const mobileToggle = document.querySelector('.sq-menu-toggle');
const mobileMenu = document.getElementById('siteMenu');
if (mobileToggle && mobileMenu) {
  const closeMenu = () => {
    mobileToggle.setAttribute('aria-expanded', 'false');
    mobileToggle.setAttribute('aria-label', 'メニューを開く');
    mobileMenu.classList.remove('is-open');
  };
  mobileToggle.addEventListener('click', () => {
    const isOpen = mobileToggle.getAttribute('aria-expanded') === 'true';
    mobileToggle.setAttribute('aria-expanded', String(!isOpen));
    mobileToggle.setAttribute('aria-label', isOpen ? 'メニューを開く' : 'メニューを閉じる');
    mobileMenu.classList.toggle('is-open', !isOpen);
  });
  mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => { if (window.innerWidth > 960) closeMenu(); }, { passive: true });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
}
