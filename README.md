# SQUARE official website

岡山アカペラサークル「SQUARE」公式サイトのCloudflare版です。

## Migration policy

- Rails版の本番環境、DNS、データは切替承認まで変更しない
- NEWS、体験・見学可能日、リリース、embeddingsは移行しない
- バンド、出演情報、バンドと出演情報の関連、画像、紹介ページを移行する
- 公開ページはWorker側でHTMLを生成し、既存URLとslugを可能な限り維持する
- D1には構造化データ、R2には投稿画像を保存する
- 共通パスワードはCloudflare Secretにハッシュとして保存し、ソースへ含めない

## Planned stack

- JavaScript
- Cloudflare Workers + Static Assets
- Cloudflare D1
- Cloudflare R2
- Hono
