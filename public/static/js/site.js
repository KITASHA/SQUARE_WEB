const socialIcons = {
  x: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        class="fill-icon"
        d="M18.9 2H22l-6.77 7.73L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.26-8.3L2.98 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.84h1.73L8.44 4.05H6.58L17.8 19.84Z"
      />
    </svg>
  `,

  instagram: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="3.2"
        y="3.2"
        width="17.6"
        height="17.6"
        rx="4.7"
      />
      <circle
        cx="12"
        cy="12"
        r="4.1"
      />
      <circle
        cx="17.35"
        cy="6.75"
        r="1"
        class="fill-icon"
      />
    </svg>
  `,

  youtube: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M21 8.1a3 3 0 0 0-2.1-2.1C17.1 5.5 12 5.5 12 5.5s-5.1 0-6.9.5A3 3 0 0 0 3 8.1 31 31 0 0 0 2.5 12 31 31 0 0 0 3 15.9 3 3 0 0 0 5.1 18c1.8.5 6.9.5 6.9.5s5.1 0 6.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-3.9 31 31 0 0 0-.5-3.9Z"
      />
      <path
        class="fill-icon"
        d="m10 15.2 5.2-3.2L10 8.8v6.4Z"
      />
    </svg>
  `
};


function headerMarkup() {
  return `
    <header class="sq-header">
      <div class="sq-header-inner">

        <a
          class="sq-brand"
          href="/"
          aria-label="SQUARE ホーム"
        >
          <span class="sq-brand-name">
            Home
          </span>
        </a>

        <button
          class="sq-menu-toggle"
          type="button"
          aria-label="メニューを開く"
          aria-expanded="false"
          aria-controls="siteMenu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav
          class="sq-nav"
          id="siteMenu"
          aria-label="メインナビゲーション"
        >
          <a href="/about">
            SQUAREについて
          </a>

          <a href="/join">
            入会について
          </a>

        </nav>

      </div>
    </header>
  `;
}


function footerMarkup() {
  return `
    <footer class="sq-footer">

      <div class="sq-footer-inner">

        <a
          class="sq-footer-brand"
          href="/"
          aria-label="SQUARE ホーム"
        >
          <small>
            岡山アカペラサークル SQUARE
          </small>
        </a>

        <div class="sq-footer-social">

          <a
            href="https://twitter.com/square_okayama"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X"
          >
            ${socialIcons.x}
          </a>

          <a
            href="https://www.instagram.com/square_okayama/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            ${socialIcons.instagram}
          </a>

          <a
            href="https://www.youtube.com/channel/UCpcjVaT57zyOhB92BROiTBA"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
          >
            ${socialIcons.youtube}
          </a>

        </div>

        <p class="sq-footer-contact">お問い合わせはX・InstagramのDMへ</p>
        <p class="sq-footer-copy">© SQUARE</p>

      </div>

    </footer>
  `;
}


/* =========================================================
   HEADER / FOOTER
========================================================= */

document
  .querySelectorAll(
    '[data-site-header]'
  )
  .forEach(
    slot => {
      slot.innerHTML =
        headerMarkup();
    }
  );


document
  .querySelectorAll(
    '[data-site-footer]'
  )
  .forEach(
    slot => {
      slot.innerHTML =
        footerMarkup();
    }
  );


/* =========================================================
   CURRENT NAV
========================================================= */

const currentPath =
  window.location.pathname
    .replace(
      /\.html$/,
      ''
    )
    .replace(
      /\/$/,
      ''
    ) || '/';


document
  .querySelectorAll(
    '.sq-nav > a[href^="/"]'
  )
  .forEach(
    link => {

      const linkPath =
        new URL(
          link.href,
          window.location.origin
        )
          .pathname
          .replace(
            /\.html$/,
            ''
          )
          .replace(
            /\/$/,
            ''
          ) || '/';


      const isBandPage =
        currentPath ===
          '/band' &&
        linkPath ===
          '/bands';


      if (
        linkPath ===
          currentPath ||
        isBandPage
      ) {

        link.setAttribute(
          'aria-current',
          'page'
        );
      }
    }
  );


/* =========================================================
   MOBILE MENU
========================================================= */

const mobileToggle =
  document.querySelector(
    '.sq-menu-toggle'
  );

const mobileMenu =
  document.getElementById(
    'siteMenu'
  );


if (
  mobileToggle &&
  mobileMenu
) {

  const closeMenu =
    () => {

      mobileToggle.setAttribute(
        'aria-expanded',
        'false'
      );

      mobileToggle.setAttribute(
        'aria-label',
        'メニューを開く'
      );

      mobileMenu.classList.remove(
        'is-open'
      );
    };


  mobileToggle.addEventListener(
    'click',
    () => {

      const isOpen =
        mobileToggle.getAttribute(
          'aria-expanded'
        ) === 'true';


      mobileToggle.setAttribute(
        'aria-expanded',
        String(
          !isOpen
        )
      );


      mobileToggle.setAttribute(
        'aria-label',
        isOpen
          ? 'メニューを開く'
          : 'メニューを閉じる'
      );


      mobileMenu.classList.toggle(
        'is-open',
        !isOpen
      );
    }
  );


  mobileMenu
    .querySelectorAll(
      'a'
    )
    .forEach(
      link =>
        link.addEventListener(
          'click',
          closeMenu
        )
    );


  window.addEventListener(
    'resize',
    () => {

      if (
        window.innerWidth >
        960
      ) {

        closeMenu();
      }
    },
    {
      passive: true
    }
  );


  document.addEventListener(
    'keydown',
    event => {

      if (
        event.key ===
        'Escape'
      ) {

        closeMenu();
      }
    }
  );
}


/* =========================================================
   BAND DATA
========================================================= */

async function fetchBands() {

  const response =
    await fetch(
      '/api/bands'
    );


  if (!response.ok) {

    throw new Error(
      `HTTP ${response.status}`
    );
  }


  const data =
    await response.json();


  return Array.isArray(
    data.bands
  )
    ? data.bands
    : [];
}


/* =========================================================
   BAND LIST
========================================================= */

async function loadBands() {

  const container =
    document.getElementById(
      'bands-list'
    );


  if (!container) {
    return;
  }


  try {

    const bands =
      await fetchBands();


    if (
      bands.length === 0
    ) {

      container.innerHTML =
        `
          <p class="bands-empty">
            現在掲載中のバンドはありません。
          </p>
        `;

      return;
    }


    container.innerHTML =
      bands
        .map(
          band =>
            createBandCard(
              band
            )
        )
        .join('');


  } catch (error) {

    console.error(
      error
    );


    container.innerHTML =
      `
        <p class="bands-error">
          バンド情報を読み込めませんでした。
        </p>
      `;
  }
}


/**
 * 一覧カード
 *
 * 画像 + バンド名だけ表示
 */
function createBandCard(
  band
) {

  const id =
    String(
      band.id || ''
    ).trim();


  if (!id) {
    return '';
  }


  const name =
    escapeHtml(
      band.name ||
      ''
    );


  const detailUrl =
    `/band?id=${
      encodeURIComponent(
        id
      )
    }`;


  const image =
    band.imageUrl &&
    safeExternalUrl(
      band.imageUrl
    )
      ? `
        <div class="band-card-image">

          <img
            src="${escapeAttribute(
              band.imageUrl
            )}"
            alt="${escapeAttribute(
              band.name || ''
            )}"
            loading="lazy"
          >

        </div>
      `
      : `
        <div
          class="
            band-card-image
            band-card-image-empty
          "
        >
          <span>
            No Image
          </span>
        </div>
      `;


  return `
    <article class="band-card">

      <a
        class="band-card-link"
        href="${detailUrl}"
      >

        ${image}

        <div class="band-card-body">

          <h2 class="band-name">
            ${name}
          </h2>

        </div>

      </a>

    </article>
  `;
}


/* =========================================================
   BAND DETAIL
========================================================= */

async function loadBandDetail() {

  const container =
    document.getElementById(
      'band-detail'
    );


  if (!container) {
    return;
  }


  const params =
    new URLSearchParams(
      window.location.search
    );


  const id =
    String(
      params.get(
        'id'
      ) || ''
    ).trim();


  if (!id) {

    showBandNotFound(
      container
    );

    return;
  }


  try {

    const bands =
      await fetchBands();


    const band =
      bands.find(
        item =>
          String(
            item.id || ''
          ) === id
      );


    if (!band) {

      showBandNotFound(
        container
      );

      return;
    }


    container.innerHTML =
      createBandDetail(
        band
      );


    if (band.name) {

      document.title =
        `${band.name} | Okayama A Cappella Circle SQUARE`;
    }


  } catch (error) {

    console.error(
      error
    );


    container.innerHTML =
      `
        <div class="band-detail-message">

          <p>
            バンド情報を読み込めませんでした。
          </p>

          <a
            href="/bands"
            class="band-back-link"
          >
            バンド一覧に戻る
          </a>

        </div>
      `;
  }
}


function createBandDetail(
  band
) {

  const name =
    escapeHtml(
      band.name ||
      ''
    );


  const description =
    escapeHtml(
      band.description ||
      ''
    );


  const members =
    Array.isArray(
      band.members
    )
      ? band.members
          .map(
            member =>
              String(
                member || ''
              ).trim()
          )
          .filter(
            Boolean
          )
      : [];


  const image =
    band.imageUrl &&
    safeExternalUrl(
      band.imageUrl
    )
      ? `
        <div class="band-detail-image">

          <img
            src="${escapeAttribute(
              band.imageUrl
            )}"
            alt="${escapeAttribute(
              band.name || ''
            )}"
          >

        </div>
      `
      : `
        <div
          class="
            band-detail-image
            band-detail-image-empty
          "
        >
          <span>
            No Image
          </span>
        </div>
      `;


  const membersHtml =
    members.length
      ? `
        <section class="band-detail-section">

          <h2>
            メンバー
          </h2>

          <ul class="band-detail-members">

            ${members
              .map(
                member =>
                  `
                    <li>
                      ${escapeHtml(
                        member
                      )}
                    </li>
                  `
              )
              .join('')}

          </ul>

        </section>
      `
      : '';


  const descriptionHtml =
    description
      ? `
        <section class="band-detail-section">

          <h2>
            バンド紹介
          </h2>

          <p class="band-detail-description">
            ${description}
          </p>

        </section>
      `
      : '';


  const links =
    createBandLinks(
      band
    );


  return `
    <div class="band-detail-layout">

      ${image}

      <div class="band-detail-content">

        <p class="section-label">
          BAND
        </p>

        <h1 class="band-detail-name">
          ${name}
        </h1>

        ${membersHtml}

        ${descriptionHtml}

        ${links}

        <div class="band-detail-actions">

          <a
            href="/bands"
            class="band-back-link"
          >
            バンド一覧に戻る
          </a>

        </div>

      </div>

    </div>
  `;
}


function showBandNotFound(
  container
) {

  container.innerHTML =
    `
      <div class="band-detail-message">

        <h1>
          バンドが見つかりませんでした
        </h1>

        <p>
          URLが正しくないか、掲載が終了した可能性があります。
        </p>

        <a
          href="/bands"
          class="band-back-link"
        >
          バンド一覧に戻る
        </a>

      </div>
    `;
}


/* =========================================================
   BAND LINKS
========================================================= */

function createBandLinks(
  band
) {

  const candidates = [
    {
      label:
        'X',

      url:
        band.x
    },

    {
      label:
        'Instagram',

      url:
        band.instagram
    },

    ...(
      Array.isArray(
        band.otherLinks
      )
        ? band.otherLinks
        : []
    )
  ];


  const links =
    candidates
      .map(
        link => ({

          label:
            String(
              link?.label ||
              'その他リンク'
            ).trim() ||
            'その他リンク',

          url:
            String(
              link?.url ||
              ''
            ).trim()
        })
      )
      .filter(
        link =>
          safeExternalUrl(
            link.url
          )
      );


  if (
    links.length === 0
  ) {

    return '';
  }


  return `
    <section class="band-detail-section">

      <h2>
        リンク
      </h2>

      <div class="band-links">

        ${links
          .map(
            link => `
              <a
                href="${escapeAttribute(
                  link.url
                )}"
                target="_blank"
                rel="noopener noreferrer"
              >
                ${escapeHtml(
                  link.label
                )}
              </a>
            `
          )
          .join('')}

      </div>

    </section>
  `;
}


/* =========================================================
   UTILITIES
========================================================= */

function safeExternalUrl(
  value
) {

  const text =
    String(
      value || ''
    ).trim();


  if (!text) {
    return false;
  }


  try {

    const url =
      new URL(
        text,
        window.location.origin
      );


    return (
      url.protocol ===
        'https:' ||
      url.protocol ===
        'http:'
    );


  } catch {

    return false;
  }
}


function escapeHtml(
  value
) {

  return String(
    value || ''
  )
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    )
    .replaceAll(
      "'",
      '&#039;'
    );
}


function escapeAttribute(
  value
) {

  return escapeHtml(
    value
  );
}

/* =========================================================
   PAGE INITIALIZATION
========================================================= */

if (document.getElementById('bands-list')) {
  loadBands();
}

if (document.getElementById('band-detail')) {
  loadBandDetail();
}
