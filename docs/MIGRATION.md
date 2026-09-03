# Rails to Cloudflare migration

## Confirmed scope

### Remove

- NEWS (topics)
- 体験・見学可能日 (events)
- リリース (releases)
- 問い合わせ内容のDB保存
- 下書き・予約公開
- embeddings

### Preserve

- トップページ
- バンド一覧・slug詳細
- バンド画像
- 出演情報一覧・詳細
- 過去出演アーカイブ
- 出演情報と複数バンドの関連
- 出演情報画像
- 紹介ページと外部リンク
- 共通パスワード方式による管理機能

## Current implementation

- [x] JavaScript + Hono Worker
- [x] Workers Static Assets
- [x] D1 schema for bands, gigs, links, members and relationships
- [x] R2 object-key based image model
- [x] Public band routes
- [x] Public gig routes and date-based archive
- [x] Existing informational URL placeholders
- [x] Redirects for removed resources
- [x] Security headers and output escaping
- [x] GitHub Actions deployment workflow
- [ ] Copy exact HTML, CSS, wording and images from Rails
- [ ] Export MySQL records and preserve band slugs
- [ ] Upload selected existing images to R2
- [x] Implement shared-password authentication
- [x] Implement authenticated band and gig CRUD
- [x] Implement CSRF protection and login rate limiting
- [x] Add upload type and size validation (file-signature validation remains)
- [ ] Create D1 database and R2 bucket
- [ ] Replace the D1 placeholder ID in wrangler.jsonc
- [ ] Configure Cloudflare and GitHub secrets
- [ ] Test at workers.dev URL
- [ ] Compare desktop and mobile views with production
- [ ] Configure redirects for every discontinued legacy URL
- [ ] Switch the custom domain only after approval

## Secrets

Never commit secret values. The planned production configuration uses:

- Cloudflare Worker secret containing only the shared password hash
- Cloudflare Worker secret for signing session cookies
- GitHub Actions secret: CLOUDFLARE_API_TOKEN
- GitHub Actions secret: CLOUDFLARE_ACCOUNT_ID

The password exposed in the Rails SessionsController must not be reused.

## Safety boundary

Do not change DNS, stop Lightsail, delete MySQL data, delete uploaded images, or rewrite Git history without explicit approval.
