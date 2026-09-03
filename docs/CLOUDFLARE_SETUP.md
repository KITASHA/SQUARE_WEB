# Cloudflare setup and staging deployment

Do not switch the custom domain during this procedure.

## Prerequisites

- A Cloudflare account with the zone for square-okayama.com
- Wrangler authenticated to the intended Cloudflare account
- Node.js 22 or later
- A newly chosen shared password that is not the password exposed by the Rails repository

## 1. Install dependencies

```sh
npm install
```

Commit the generated package-lock.json before enabling automatic deployment.

## 2. Create resources

```sh
npx wrangler d1 create square-web
npx wrangler r2 bucket create square-web-images
```

Copy the D1 database ID returned by Cloudflare into `wrangler.jsonc`, replacing `REPLACE_AFTER_D1_CREATION`.

Do not add a custom domain yet.

## 3. Apply the schema

```sh
npm run db:migrate:remote
```

## 4. Generate and store secrets

Choose a new shared password. Do not reuse the value exposed in the Rails SessionsController.

Set the password only in the current shell environment and run:

```sh
SQUARE_ADMIN_PASSWORD='new-long-password' npm run secrets:generate
```

Copy the generated hash and session secret separately into Wrangler:

```sh
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put SESSION_SECRET
```

Never commit either value or the original password.

## 5. Export existing production data

Use a database account with read-only permission when possible.

```sh
MYSQL_URL='mysql://readonly-user:password@host/database' npm run data:export
npm run data:convert
```

The generated production export, SQL and image manifest are ignored by Git.

Review record counts and the generated SQL before applying it.

## 6. Import into D1

```sh
npx wrangler d1 execute square-web --remote --file migration/d1-import.sql
```

Verify band IDs, slugs, gig dates and relation counts before continuing.

## 7. Upload images to R2

Run this from a machine that has a read-only copy of the Rails `public/uploads` directory:

```sh
npm run images:upload -- migration/image-manifest.json /absolute/path/to/public/uploads square-web-images
```

The uploader verifies Active Storage byte sizes and checksums. It does not move or delete source images.

## 8. Deploy to the temporary URL

```sh
npm run deploy
```

Test the resulting `workers.dev` URL before configuring GitHub Actions or the custom domain.

## 9. Configure GitHub Actions

Add these repository secrets:

- `CLOUDFLARE_API_TOKEN`: scoped to the required Worker, D1 and R2 operations
- `CLOUDFLARE_ACCOUNT_ID`

Do not use the Cloudflare global API key.

## 10. Validation gate

Before a domain switch, verify:

- Every retained legacy URL
- Every retained band slug
- Upcoming and archived gigs
- Band and gig relationships
- All migrated images
- Login, logout and rate limiting
- Create, edit and delete operations
- Invalid URLs and invalid upload rejection
- Mobile and desktop layouts
- 404 and legacy redirects
- Backup/export of D1 and R2

DNS, Lightsail and MySQL remain unchanged until explicit approval.
