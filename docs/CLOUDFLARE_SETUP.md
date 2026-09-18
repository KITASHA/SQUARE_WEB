# Cloudflare 仮公開手順

1. Node.js 24以上で `npm ci` を実行。
2. `npm run validate` と `npm run deploy:dry-run` が成功することを確認。
3. `npx wrangler login` からブラウザでOAuth認証。
4. `npm run deploy` で `square-web-staging` の workers.dev URLへ公開。
5. スマホとPCで6ページ・トップの6枚のカード・メニュー・リンク・旧URL転送を確認。廃止した `/homes/workshop`・`.html`・配下URLはトップへ301転送されることを確認。

D1・R2の作成、アプリ用Secretsの登録、MySQLエクスポート、画像アップロード処理は不要です。すべての掲載画像とCSSをStatic Assetsで配信します。

GitHub Actionsはworkflow_dispatchのみです。使用する場合はGitHubのリポジトリSecretsに `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を設定してください。認証情報をコードや会話へ貼り付けないでください。

現在は `PREVIEW: "true"` と `public/robots.txt` の `Disallow: /` により仮公開を検索対象から除外します。本番公開時は両方の扱いを別途見直します。

独自ドメイン・DNS変更、Lightsail停止、既存DB・画像削除はこの手順に含みません。
