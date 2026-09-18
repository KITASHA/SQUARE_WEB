# SQUARE 公式サイト

岡山アカペラサークル SQUARE の静的サイトです。Cloudflare Workers Static Assets で公開します。
Bootstrap は使用せず、HTML + CSS + JavaScript だけで構成しています。

## 公開ページ

| URL | 内容 |
| --- | --- |
| / | トップページ |
| /homes/about | SQUAREについて |
| /homes/show_1 | 定期活動会 |
| /homes/show_2 | Okayama Music SQUARE |
| /homes/show_3 | スターターバンド制度 |
| /homes/join | 入会について |

## ファイル構成

```text
public/
├─ index.html
├─ 404.html
├─ robots.txt
├─ homes/
│  ├─ about.html
│  ├─ join.html
│  ├─ show_1.html
│  ├─ show_2.html
│  └─ show_3.html
└─ static/
   ├─ css/
   │  └─ style.css
   ├─ js/
   │  └─ site.js
   ├─ images/
   ├─ icons/
   │  ├─ favicon.ico
   │  └─ apple-touch-icon.png
   └─ manifest.json
```

普段のデザイン変更は `public/static/css/style.css`、共通ヘッダー・フッターは `public/static/js/site.js`、画像は `public/static/images/` を編集します。

色は `style.css` 冒頭の `--sq-*` CSS変数にまとめています。グレーから青や緑に変更する場合も、基本的にはここを変更すれば全ページに反映されます。

## 開発・確認

Node.js 24以上を使用します。

```sh
npm ci
npm run validate
npm run dev
```

ローカル起動後は通常 `http://localhost:8787` で確認できます。

## Cloudflare

`public/` を Static Assets として配信し、`src/index.js` は旧URLのリダイレクトとセキュリティヘッダーを担当します。

仮公開では `wrangler.jsonc` の `PREVIEW=true` により `X-Robots-Tag: noindex, nofollow` を付与し、`robots.txt` でもクロールを止めています。本番公開時は検索公開方針に合わせて変更してください。

```sh
npx wrangler login
npm run deploy
```
