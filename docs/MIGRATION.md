# 移行メモ

旧Rails/Bootstrap由来の表示構成から、管理しやすい静的HTML/CSS/JavaScriptへ移行済みです。

## 現在の方針

- Bootstrap / Bootstrap Icons は使用しない。
- CSSは `public/static/css/style.css` の1ファイル。
- JavaScriptは `public/static/js/site.js` の1ファイル。
- 画像は `public/static/images/` に集約。
- 共通ヘッダー・フッターはJavaScript側で一元管理。
- Cloudflare側の入口は `src/index.js` のまま維持。

旧バンド管理、出演管理、ログイン、管理画面、NEWS、ワークショップ等の動的機能は公開対象外です。
