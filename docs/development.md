# Develop PastePost

[User guide](../README.md) · [Vault operations](vault-release.md)

## Where to make changes

| Area | Entry points |
| --- | --- |
| Routes and hosting | [`src/routes/`](../src/routes): `/` hosts Extract, Vault, Settings, and the signed-out account form; `/login` has the account form and redirects signed-in users to `/`; `/api/auth/*` dispatches to Better Auth. Both page routes accept `url`. The root sets document metadata and wraps the app. [Vite/Nitro config](../vite.config.ts), [manifest](../public/manifest.webmanifest), and [platform middleware](../server/middleware/grok-pwa.ts) control serving and installation. |
| Account UI and authorization | [Account form](../src/components/pastepost-account.tsx) and [auth library](../src/lib/auth). Better Auth owns email/password accounts and cookie sessions. The GitHub repository and X token are unrelated to PastePost sign-in. Auth middleware supplies a verified user ID to the extraction and Vault server functions. Vault requests also reject an account mismatch if the session changes across tabs. |
| Extracting and formatting | [`src/lib/extract/`](../src/lib/extract): change accepted URLs or bulk parsing in `parse.ts`, external source selection in `sources.server.ts`, the authenticated request boundary in `extract-fn.ts`, or Markdown output in `markdown.ts`. Change composer, bulk queue, reader, and clipboard behavior in [`pastepost-app.tsx`](../src/components/pastepost-app.tsx). |
| Vault and search | [Vault UI](../src/components/pastepost-vault.tsx) and [`src/lib/vault/`](../src/lib/vault). Change validation and actions in `schema.ts` and `vault-fns.ts`; change owner-scoped storage, search, and cursor pagination in `store.server.ts`. Database setup is in [`db.ts`](../src/lib/db.ts) and [`migrations/`](../migrations). |
| Device recovery and export | `use-archive.ts` and `pending.ts` in the Vault library handle failed saves; `backup.ts` reads the old history keys and serializes or imports ZIPs. The Vault ZIP contains a versioned manifest, structured `posts/<id>.json` files, and readable Markdown copies. Import uses the JSON records when a supported manifest is present. |
| Theme and layout | [`src/styles.css`](../src/styles.css), [root route](../src/routes/__root.tsx), and the app components. See the [historical Apple audit](../APPLE-WEB-APP-AUDIT.md) for the original device coverage and constraints. |

### Extraction and persistence

The server races FxTwitter v2 and VxTwitter, giving FxTwitter a short grace period. If neither yields usable content, it tries legacy FxTwitter, X oEmbed, Jina, then the X API if the user entered an optional bearer token. Requests have per-source and overall time budgets; retryable failures such as rate limits, timeouts, and upstream 5xx get one retry per attempt before fallback when time permits. Thread expansion is best effort and keeps posts by the same author. The settings token is stored in the browser and sent to the extraction server function with an extract request when configured; the server uses it against the X API only as the final fallback.

Bulk extraction processes one entry at a time. The UI checks the Vault first, calls the extractor on a miss, then sends the normalized result to the separate Vault save action. Postgres keys each record by verified user ID and post ID. A duplicate save or import leaves the original record and flags unchanged.

The client tries to write the new record to account-scoped IndexedDB before sending it to the server. It retries on app mount, when the browser comes online, every 30 seconds while the app is open, and from **Retry saves**. If the server save and device storage both fail, the current page can still offer a Markdown download; a reload may lose that pending extract. The pending queue is not included in a Vault ZIP until the records sync.

### iOS Shortcut handoff

Pass the shared X URL or ID as a URL-encoded query value to `https://pastepost.vercel.app/?url=<encoded-value>`. For example, a Shortcuts share-sheet action can take the shared URL, URL-encode it, and open that PastePost address. The account form retains the value through sign-in. Once the signed-in app hydrates, it consumes the query parameter and extracts the link. Launching an installed Home Screen app may not deliver the URL in every iOS workflow. A fallback Shortcut can copy the X link to the clipboard; open PastePost and tap **Paste & Extract**. The temporary launch diagnostics were removed in [PR #14](https://github.com/donovinsims/pastepost/pull/14). Physical-device delivery should be checked separately from a desktop browser test.

### Compatibility names

Use **PastePost** and the canonical links in the README. The Vercel project is still named `xmark`; its canonical public alias is `pastepost.vercel.app`. Browser recovery needs both `pastepost.history` and `xtract.history`; theme and settings also read legacy `xtract.*` keys. Bulk ZIP downloads still use the `xtract-bulk-….zip` prefix. Legacy ZIP import matches the Markdown names inside the ZIP, so renaming the outer file does not affect recovery. The scaffold package name `app-builder-workspace` is internal and mirrored in the lockfile. Keep the platform's `grok-pwa-*` scripts and middleware intact.

## Local setup

Use Node.js **22.12 or later on the 22.x line** to match CI, npm, and Git. Vercel currently uses Node 24.x. Run from the repository root with production credentials absent from the shell:

```sh
npm ci
npm run dev
```

Open `http://localhost:8080`. With no database URL, local development uses in-memory PGlite and applies the root migrations automatically. Create a disposable account; local data can disappear on restart. To work with durable storage locally, use a dedicated test Postgres/Neon database and export its configuration in your shell before starting the command. Keep credentials out of Git.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection for Better Auth, the Vault, and deployment migrations. Omit for local PGlite and CI builds. |
| `BETTER_AUTH_SECRET` | Better Auth signing secret. Set a separate value per hosted environment; Vercel Vault operations require it and a real database. |
| `BETTER_AUTH_URL` | Set this to the exact hosted origin you use for sign-in, separately for Production and staging. Omit it for localhost. |
| `VITE_AUTH_ENABLED` | Scaffold auth flag read by the environment wrapper and auth modules. Keep auth enabled for PastePost; setting it to `false` is not a production setup. |
| `VERCEL` | Set by Vercel. The Vault uses it to reject hosted storage that lacks a real database or signing secret. |
| `GROK_*` | App Builder broker/preview settings in the scaffold. Ordinary PastePost email/password and public X extraction do not require Grok credentials. |

`npm run build` builds the app and invokes `npm run db:migrate`. The migration command skips when `DATABASE_URL` is absent; otherwise it applies root SQL files in order and records each filename in `_migrations`. [`0001_auth.sql`](../migrations/0001_auth.sql) creates the Better Auth tables; [`0002_vault.sql`](../migrations/0002_vault.sql) adds the Vault table and index. The copy under `migrations/auth/` is a scaffold template and is not applied recursively. Add future migrations as new numbered files; don't edit applied SQL to try to rerun it.

## Verification commands

These commands passed locally on Node 22.23.4, with no deployment database configured. The lint step reported two warnings and no errors.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

[CI](../.github/workflows/ci.yml) runs the same sequence on PRs to `main` and pushes to `main`. The tests cover URL parsing, Markdown output, auth helpers, migration ordering, browser state, full and legacy ZIP recovery, and Vault persistence and account isolation using PGlite. These checks do not prove a hosted database is configured or that iOS delivers a Shortcut URL.

To repeat the browser checks, have Google Chrome installed and keep the local dev server running with no deployment database. From a second shell in the repo, run:

```sh
PASTEPOST_QA_CHANNEL=chrome node scripts/vault-smoke.mjs
PASTEPOST_QA_CHANNEL=chrome node scripts/shared-url-smoke.mjs
PASTEPOST_QA_CHANNEL=chrome node scripts/paste-extract-smoke.mjs
```

All three passed locally. They use disposable accounts and controlled extraction results to check sign-in and account isolation, automatic saves, retry across reload, legacy recovery and ZIP export/import, and the URL and clipboard handoffs. They do not call live X sources or test a physical iPhone.
