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

export async function loadBands() {

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
export function createBandCard(
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
    safeBandImageUrl(
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

export async function loadBandDetail() {

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
        `${band.name} | 岡山アカペラサークルSQUARE`;
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


export function createBandDetail(
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
    safeBandImageUrl(
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

export function createBandLinks(
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
            normalizeExternalUrl(
              link?.url
            )
        })
      )
      .filter(
        link => link.url
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

export function safeExternalUrl(
  value
) {

  const text =
    String(
      value || ''
    ).trim();


  if (!/^https?:\/\//i.test(text)) {
    return false;
  }


  try {

    const url =
      new URL(
        text
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


export function safeBandImageUrl(value) {
  const text = String(value || '').trim();

  if (safeExternalUrl(text)) {
    return true;
  }

  // R2 images may use a same-site path instead of an absolute URL.
  if (!text.startsWith('/media/bands/')) {
    return false;
  }

  try {
    const url = new URL(text, window.location.origin);
    return url.origin === window.location.origin &&
      url.pathname.startsWith('/media/bands/');
  } catch {
    return false;
  }
}


export function normalizeExternalUrl(value) {
  const input = String(value || '');

  if (/\p{Cc}/u.test(input)) {
    return '';
  }

  const text = input.trim();

  // Reject ambiguous separators and control characters before URL parsing.
  if (!text || /[\s\\]/u.test(text)) {
    return '';
  }

  const hasHttpScheme = /^https?:\/\//i.test(text);

  if (!hasHttpScheme && /^[/.?#]/.test(text)) {
    return '';
  }

  try {
    const url = new URL(hasHttpScheme ? text : `https://${text}`);

    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      return '';
    }

    if (!hasHttpScheme) {
      // Add HTTPS only to a domain name, never to a site-relative path.
      const labels = url.hostname.split('.');
      const validLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
      if (labels.length < 2 || !labels.every(label => validLabel.test(label)) ||
          !/^[a-z]/i.test(labels.at(-1))) {
        return '';
      }
    }

    return url.href;
  } catch {
    return '';
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

export async function initializeBandsCard() {
  const image = document.querySelector('[data-bands-card]');

  if (!image) {
    return;
  }

  try {
    const bands = await fetchBands();
    const imageUrls = bands
      .map(band => band.imageUrl)
      .filter(safeBandImageUrl);

    if (imageUrls.length > 0) {
      image.src = imageUrls[Math.floor(Math.random() * imageUrls.length)];
    }
  } catch {
    // Keep the static fallback image when the band API is unavailable.
  }
}
