# SQUARE 公式サイト

既存の文章・画像・Bootstrapデザインを保持した、Cloudflare Workers Static Assets 用サイトです。

## 残すページ

| URL | 内容 |
| --- | --- |
| / | トップページ |
| /homes/about | SQUAREについて |
| /homes/show_1 | 定期活動会 |
| /homes/show_2 | Okayama Music SQUARE |
| /homes/show_3 | スターターバンド制度の紹介 |
| /homes/join | 入会について・資料・申込フォームへのリンク |

公開ページは上記の6ページです。トップには既存のカードデザインで、SQUAREについて・定期活動会・Okayama Music SQUARE・スターターバンド制度・入会について・YouTubeの6枚を配置しています。

スターターバンド制度の説明は紹介文章として残します。登録バンドの一覧・詳細・画像管理機能は廃止しています。

バンド、出演情報、認証・管理画面、NEWS、体験・見学可能日、リリース情報、発声ワークショップ動画は廃止しました。旧 `/homes/workshop` はトップへ301転送します。活動紹介のYouTubeチャンネルリンクは残します。DB、R2、Secrets、Rails、Hono、データ移行処理は不要です。

## 開発・確認

Node.js 24以上を使用します。

```sh
npm ci
npm run validate
npm run deploy:dry-run
npm run dev
```

HTMLは `public/index.html` と `public/homes/*.html`、元のCSSは `public/legacy.css`、画像は `public/images/` にあります。トップの承認済みカード変更を除き、元の紹介文、リンク、クラス、インラインスタイルを維持しています。カードにも既存のBootstrap構造を使用し、CSSは変更していません。メニューの開閉とページ上部への移動だけを `public/site.js` が担当します。

`tests/fixtures/content-baseline.json` は移植元の本番HTMLを独立して記録した検証基準です。廃止したワークショップも過去の参照として記録に残します。テストでは対象から除き、トップの承認済みカード変更は独立した期待値として比較します。公開HTMLから再生成してテストを通す使い方はしません。

## 仮公開

`wrangler.jsonc` は `square-web-staging` の workers.dev 専用です。独自ドメイン・D1・R2の設定はありません。仮公開は `X-Robots-Tag` と `robots.txt` で検索対象から外しています。

```sh
npx wrangler login
npm run deploy
```

本番ドメインの切り替えは別作業です。GitHub Actionsのデプロイは手動実行に限定しています。

詳細: [移植範囲](docs/MIGRATION.md)、[Cloudflare手順](docs/CLOUDFLARE_SETUP.md)、[検証記録](docs/REVIEW.md)。
