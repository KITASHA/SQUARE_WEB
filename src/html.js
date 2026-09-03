const escapeMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => escapeMap[char]);
}

export function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function layout({ title, body, authenticated = false }) {
  const sessionLink = authenticated
    ? '<form action="/logout" method="post"><button class="link-button">ログアウト</button></form>'
    : '<a href="/login">会員ログイン</a>';

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="岡山アカペラサークル SQUARE 公式サイト">
  <title>${escapeHtml(title)} | SQUARE</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/">SQUARE</a>
    <nav aria-label="メインナビゲーション">
      <a href="/homes/about">SQUAREについて</a>
      <a href="/bands">バンド紹介</a>
      <a href="/gigs">出演情報</a>
      ${sessionLink}
    </nav>
  </header>
  <main>${body}</main>
  <footer><small>&copy; SQUARE Okayama</small></footer>
</body>
</html>`;
}

export function bandCard(band) {
  const image = band.image_key
    ? `<img src="/media/${encodeURIComponent(band.image_key)}" alt="${escapeHtml(band.band_name)}">`
    : "";
  return `<article class="card">
    <a href="/bands/${encodeURIComponent(band.slug)}">
      ${image}
      <h2>${escapeHtml(band.band_name)}</h2>
    </a>
  </article>`;
}

export function gigCard(gig) {
  return `<article class="card">
    <h2><a href="/gigs/${gig.id}">${escapeHtml(gig.gig_name)}</a></h2>
    <p><time datetime="${escapeHtml(gig.event_date)}">${escapeHtml(gig.event_date)}</time></p>
    ${gig.location ? `<p>${escapeHtml(gig.location)}</p>` : ""}
  </article>`;
}
