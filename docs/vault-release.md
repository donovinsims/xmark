# PastePost Vault release and recovery

[User guide](../README.md) · [Development](development.md)

## Deployment evidence

Snapshot checked 2026-11-17. **Ready** is a Vercel build/deployment status. It does not establish that an authenticated flow or the underlying database was tested.

| Target | Observed |
| --- | --- |
| Production | The live [PastePost alias](https://pastepost.vercel.app) served HTTP 200 on both `/` and `/login` and resolved to the Ready Production deployment of [`f07d4f9`](https://github.com/donovinsims/pastepost/commit/f07d4f9e31fefc83181b2c56a5c660a7494d6f46) in Vercel project `xmark`. This revision includes Vault and removes the Shortcut diagnostic panel. |
| PR preview | Vercel listed a Ready Preview for `fb073fe`, the head of [PR #14](https://github.com/donovinsims/pastepost/pull/14). Unauthenticated requests redirected to Vercel sign-in. |
| Vault staging | The `pastepost/durable-vault` branch alias resolves to a Ready Preview at `f7f52c7` in the same project. Unauthenticated requests redirected to Vercel sign-in. Vercel lists separate Preview and Production database settings and branch-scoped auth settings for Vault staging; database identity was not independently checked. [PR #9](https://github.com/donovinsims/pastepost/pull/9) records staging checks for automatic save, sign-in and retrieval in a fresh browser session, and export of an old item and a new extract. These are rollout records, not a new authenticated staging test. |
| CI and backup | [Main CI](https://github.com/donovinsims/pastepost/actions/runs/44085243493) passed at `f07d4f9`. The [manual backup run](https://github.com/donovinsims/pastepost/actions/runs/44063059666) at `5a31102` logged a successful encrypted download and restore into isolated Postgres. This verifies one drill; it does not establish that every scheduled backup ran or that every desired historical version is present. |

## Release sequence

1. Open a PR against `main`. Wait for [GitHub CI](../.github/workflows/ci.yml) (install, lint, typecheck, test, build) and the Vercel Preview deployment for the intended SHA. GitHub's CI build has no database URL; a Vercel build with one applies migrations.
2. In Vercel project `xmark`, configure Preview or the designated staging branch with an isolated Neon database, its own `DATABASE_URL` and `BETTER_AUTH_SECRET`, and its own auth origin if setting `BETTER_AUTH_URL`. Set the auth origin to the exact staging URL you will use for sign-in. Production uses the live alias and separate database and secret. Confirm the target database in Neon/Vercel before triggering a build or migration; checking variable names alone cannot prove isolation. Never copy a production credential or dump into ordinary PR previews.
3. In staging, use disposable accounts and a known public post. Verify sign-up/sign-in, extraction and automatic save, reload and fresh-browser retrieval, search, Favorites and reversible Trash. Test that a second account cannot see the first account's entries. Import representative legacy Markdown and full Vault ZIP fixtures, confirm duplicate imports leave existing items intact, and export again. Test retry after an interrupted save. For Shortcut changes, verify both the URL and clipboard paths on an actual iPhone.
4. Before a Vault schema or storage release, verify a recent production backup and a successful isolated restore. Keep migrations compatible with the previous app version where possible. After approval, merge to the production branch or deploy through Vercel using Production configuration. Do not point the public alias at a build using the staging database.
5. In Vercel, check the Production target, its SHA, Ready status, and the live alias. Check the public page and sign-in; use an approved test account for an authenticated save/read check when appropriate. Review deployment/runtime logs for migration, auth, or database failures. Record CI, deployment, and backup evidence separately.

## Rollback

For a bad application release, roll the production alias back to the last known good **Production** deployment with compatible schema. Verify the alias, sign-in, and Vault reads afterward. Keep the existing production database and applied migrations in place; reverting a Vercel deployment does not undo SQL or recover lost rows. For a data incident, preserve the current database and stop risky writes if needed. Restore Neon point-in-time recovery or a verified dump into an isolated target first, compare records, and approve a targeted recovery or cutover separately.

## Nightly encrypted backups

[Vault backup workflow](../.github/workflows/vault-backup.yml) is scheduled at **08:23 UTC** and can be dispatched manually. Restrict the GitHub Actions environment `vault-backup` to trusted runs on `main`. Configure these secret names:

| Secret | Scope |
| --- | --- |
| `BACKUP_DATABASE_URL` | Dedicated read-only role that can dump the required production schema and data. |
| `VAULT_BACKUP_BLOB_TOKEN` | Read/write token for the dedicated **private** Vercel Blob backup store, exposed to the script as `BLOB_READ_WRITE_TOKEN`. |
| `VAULT_BACKUP_PASSPHRASE` | Unique encryption passphrase; retain an independent recovery copy through the operator's secret manager. |

The job checks out the repo, dumps Postgres in custom format with the Postgres 18 client, encrypts it with GPG AES-256 and uploads via the [Blob HTTP helper](../scripts/vault-backup-blob.mjs). This avoids the CLI's interactive Vercel login requirement. Objects use `pastepost/slot-NN.dump.gpg`, selected by UTC epoch day modulo 30. A successful upload overwrites that slot; a missed day can leave a gap or stale object. Rotation never deletes Vault posts. Check failed and missed runs and enable notifications. Keep Neon point-in-time recovery available as a separate recovery path and verify its configured retention in Neon.

## Verify a restore

In GitHub Actions, open **Vault backup**, choose **Run workflow** on `main`, and leave `verify_restore` enabled. This creates a new production dump and writes today's slot, so use an approved run. The workflow downloads the encrypted object with authenticated Blob access, decrypts it, compares the dump bytes, and uses `pg_restore --no-owner --no-acl --exit-on-error` in disposable Postgres 18. It checks for both migration records and executes the Vault-to-owner count query. Confirm the run reached **Verified encrypted download and restore into isolated Postgres**. A passing job does not compare all source and target rows or prove that a particular historical post exists.

For an incident or a deeper drill, select the intended UTC backup by the run and object metadata. Retrieve it with authenticated private Blob access and decrypt via the operator's secret manager. Restore into an empty isolated Postgres database using a compatible client/server version and the flags above. Confirm both migration records, compare expected counts where available, verify owner links and representative post bodies, Favorites and Trash, and test an approved staging login/read flow if appropriate. Keep output free of private rows, and dispose of temporary plaintext and the test target after the drill. Never restore directly over production as a verification step.

For user-level recovery, prefer the [browser or ZIP workflow](../README.md#recover-an-older-archive) before investigating a database restore. User ZIPs and the operator's encrypted Postgres dumps serve different purposes; **Import ZIP** does not accept a database dump.
