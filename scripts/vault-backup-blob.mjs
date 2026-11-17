#!/usr/bin/env node
/**
 * Move the encrypted Vault backup to and from the dedicated private Blob store.
 *
 * The `vercel blob` CLI cannot run on a GitHub Actions runner: with no Vercel
 * login it aborts with `No existing credentials found` even when `--rw-token`
 * is supplied (CLI 59.0.0), which failed the backup job *after* the dump had
 * already been encrypted. The SDK documents a read-write token as the supported
 * credential for code running outside Vercel, so this script speaks the same
 * HTTP API the SDK does (`@vercel/blob` 2.9.0, API version 13):
 *
 *   put  PUT  https://vercel.com/api/blob/?pathname=…
 *   get  GET  https://<store-id>.private.blob.vercel-storage.com/<pathname>
 *
 * usage:
 *   node scripts/vault-backup-blob.mjs put <file> <pathname>
 *   node scripts/vault-backup-blob.mjs get <pathname> <file>
 *
 * BLOB_READ_WRITE_TOKEN must hold the backup store's read-write token.
 */
import { readFile, writeFile } from "node:fs/promises";

const API_URL = "https://vercel.com/api/blob";
const API_VERSION = "13";
const PRIVATE_HOST_SUFFIX = ".private.blob.vercel-storage.com";

/** The store id encoded in a `vercel_blob_rw_<store-id>_<secret>` token. */
export function storeIdFromToken(token) {
  const [, , , storeId = ""] = token.split("_");
  return storeId;
}

function usage(message) {
  console.error(`${message}\nusage: vault-backup-blob.mjs put <file> <pathname> | get <pathname> <file>`);
  process.exit(2);
}

async function putBlob({ token, file, pathname }) {
  const body = await readFile(file);
  const response = await fetch(`${API_URL}/?${new URLSearchParams({ pathname })}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "x-vercel-blob-store-id": storeIdFromToken(token),
      "x-api-version": API_VERSION,
      "x-api-blob-request-id": `${storeIdFromToken(token)}:${Date.now()}`,
      "x-api-blob-request-attempt": "0",
      "x-vercel-blob-access": "private",
      "x-add-random-suffix": "0",
      "x-allow-overwrite": "1",
      "x-content-length": String(body.byteLength),
      "x-content-type": "application/octet-stream",
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`upload failed (${response.status}): ${await response.text()}`);
  }
  const result = await response.json();
  console.log(`uploaded ${pathname} (${body.byteLength} bytes) -> ${result.url ?? "stored"}`);
}

async function getBlob({ token, pathname, file }) {
  const storeId = storeIdFromToken(token);
  const url = `https://${storeId}${PRIVATE_HOST_SUFFIX}/${pathname}`;
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`download failed (${response.status}): ${await response.text()}`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  await writeFile(file, body);
  console.log(`downloaded ${pathname} (${body.byteLength} bytes) -> ${file}`);
}

async function main(argv) {
  const [command, ...rest] = argv;
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) usage("BLOB_READ_WRITE_TOKEN is not set");
  if (!storeIdFromToken(token)) usage("BLOB_READ_WRITE_TOKEN is not a vercel_blob_rw_ token");

  if (command === "put") {
    const [file, pathname] = rest;
    if (!file || !pathname) usage("put needs <file> <pathname>");
    await putBlob({ token, file, pathname });
  } else if (command === "get") {
    const [pathname, file] = rest;
    if (!pathname || !file) usage("get needs <pathname> <file>");
    await getBlob({ token, pathname, file });
  } else {
    usage(`unknown command: ${command ?? "(none)"}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`[vault-backup-blob] ${err.message}`);
    process.exit(1);
  });
}
