# 現行構成レビュー

- Bootstrap を削除し、サイト専用CSS `public/static/css/style.css` に統一。
- 共通ヘッダー・フッターは `public/static/js/site.js` から全ページへ挿入。
- 画像、CSS、JavaScript、アイコン、manifest を `public/static/` 以下へ整理。
- PC / タブレット / スマートフォンのレスポンシブ表示をCSSで実装。
- Cloudflare Workers Static Assets の構成、旧URLリダイレクト、preview時の noindex を維持。
- 公開ページはトップ、SQUAREについて、定期活動会、Okayama Music SQUARE、スターターバンド制度、入会についての6ページ。
