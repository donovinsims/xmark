# PastePost

[Open PastePost](https://pastepost.vercel.app) · [Source on GitHub](https://github.com/donovinsims/pastepost)

PastePost turns public X posts, threads, and articles into portable Markdown. Extract a link, read or export it, and keep a copy in your account's Vault.

## Using PastePost

1. Open the app and choose **Create account**. Enter an email and a password of at least eight characters. On another browser or device, choose **Sign in** with the same credentials to open the same Vault. The app does not expose a password reset flow.
2. Paste a public X or Twitter post URL or a numeric status ID and choose **Extract**. **Paste link** fills an empty input; **Paste & Extract** reads and submits the clipboard when permitted. If clipboard access fails, paste manually. Use **Bulk** for up to **20 unique post IDs per run**, separated by spaces, commas, or newlines. Split longer lists into separate runs.
3. Successful new extracts save automatically. A repeat normally opens the original from the Vault. Check the reader's save status; if it says **Not synced**, use **Retry saves** or download the Markdown before leaving. Upstream access or formatting can vary; private and deleted posts cannot be reliably fetched.
4. Open **Vault** to browse, favorite, move a post to Trash, or restore it. Search matches title, author name or handle, post type, and ID; it does not search the full post body. The archive is paginated and has no app-enforced post count or age limit. The 20-ID limit applies only to a bulk extraction run.
5. Copy, share, or download an individual result as Markdown. A bulk run can export combined Markdown or a ZIP of Markdown files. Use the Vault ZIP export for the entire account archive, including Favorites and Trash. Media in the Markdown is linked; the ZIP does not make those remote media files available offline.

### Recover an older archive

- **Recover from this browser** reads surviving PastePost/Xtract history in the current browser profile and site origin. Try it in each browser or installed web app that held posts. Storage from another domain, profile, or install is not automatically readable here. If the older app can still export its archive, bring that ZIP to the live app. Cleared, evicted, or previously discarded entries cannot be reconstructed from browser storage.
- **Import ZIP** accepts a full PastePost Vault export or an older PastePost bulk ZIP with root-level `@handle-ID.md` files. Full ZIPs preserve the stored records, dates, Favorites, and Trash. Older ZIPs retain Markdown and whatever metadata can be read from it; they do not reconstruct the original structured thread, favorite/trash flags, or extraction timestamps. A combined Markdown file is not an import archive.
- Review the import confirmation while signed into the intended account. Recovery and import add only missing post IDs; they leave existing items and their flags intact. An import can skip entries larger than 4,000,000 bytes and rejects more than 256,000,000 bytes of matching expanded entries in one ZIP. Those are import limits, not Vault retention limits.

## Developer and operator docs

- [Architecture, local setup, tests, and Shortcut handoff](docs/development.md)
- [Vault release, deployment evidence, backups, and restore](docs/vault-release.md)
- [Historical Apple web-app audit](APPLE-WEB-APP-AUDIT.md)

## Recent changes

Dates below come from commits on `main`.

| Date | Change |
| --- | --- |
| 2026-11-17 | [Durable Vault (#9)](https://github.com/donovinsims/pastepost/pull/9): account-scoped storage, automatic saving and retry, reversible Trash, and browser and ZIP recovery. |
| 2026-11-17 | The backup job switched to a [scoped Blob credential (#10)](https://github.com/donovinsims/pastepost/pull/10), then the [Blob HTTP API (#11)](https://github.com/donovinsims/pastepost/pull/11), and added [checkout before upload (#12)](https://github.com/donovinsims/pastepost/pull/12). A [manual backup and isolated restore](https://github.com/donovinsims/pastepost/actions/runs/44063059666) passed. |
| 2026-11-17 | [Removed the temporary Shortcut diagnostic panel (#14)](https://github.com/donovinsims/pastepost/pull/14). Incoming link extraction and the clipboard fallback remain. |
| 2026-11-04 | [Apple web app improvements (#8)](https://github.com/donovinsims/pastepost/pull/8): safe-area and reader improvements, draft persistence, and one-tap paste. |
