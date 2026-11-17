# PastePost Vault release and recovery

## Before promoting a release

1. Attach an isolated Neon database to the Vercel preview first. Map its connection string to `DATABASE_URL`. Set `BETTER_AUTH_SECRET` to an environment-specific random secret and `BETTER_AUTH_URL` to the target origin. Production uses the existing `https://pastepost.vercel.app` origin and a separate database and secret. The build applies both additive migrations. Never point a preview or test at production.
2. Enable Neon point-in-time recovery at the longest window available on the approved plan. Create a dedicated private Vercel Blob store with no application assets. The backup job rotates through 30 daily slots. It replaces a slot only after a successful dump, encryption, and upload. This rotation never expires any posts in the Vault database.
3. Restrict the GitHub Actions `vault-backup` environment to `main` and use the secret names in [the backup workflow](../.github/workflows/vault-backup.yml). Use a dedicated read-only database role, a token scoped to the dedicated private Blob store, and a unique encryption passphrase retained independently by the operator. Enable workflow failure notifications for the operator.
4. Run the backup before promoting the deployment. Download the encrypted object with authenticated Blob access, decrypt it, and restore using a matching Postgres major version with `pg_restore --no-owner --no-acl --exit-on-error` into an empty isolated database. Check schema and row counts and, when the source has content, verify retained posts, ownership, and Trash. Check that staging uses the real database after reload and across browser sessions.
5. With deployment approval, apply the same setup to production, verify the backup workflow, and confirm the production alias serves the tested revision. A deployment rollback should preserve the Neon database and its migrations.

## Recovering posts

In the Vault, use **Recover from this browser** on each browser or installed web app with surviving local posts. Use **Import ZIP** for old PastePost Markdown archives and full Vault ZIPs. Review the count before merging. These imports insert only missing post IDs. If investigating a database incident, restore a backup into a separate branch or database and recover the affected records there before touching production.
